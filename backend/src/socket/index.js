const jwt = require('jsonwebtoken');
const pool = require('../db');

const onlineUsers = new Map(); // userId -> socketId

module.exports = (io) => {
  // Auth middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query('SELECT id, username, display_name, avatar_url FROM users WHERE id=$1', [decoded.userId]);
      if (!result.rows[0]) return next(new Error('User not found'));

      socket.user = result.rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 User connected: ${socket.user.username}`);

    // Track online
    onlineUsers.set(userId, socket.id);

    // Update status
    await pool.query('UPDATE users SET status=$1, last_seen=NOW() WHERE id=$2', ['online', userId]);
    io.emit('user:status', { userId, status: 'online' });

    // Join user's chat rooms
    const chats = await pool.query('SELECT chat_id FROM chat_members WHERE user_id=$1', [userId]);
    chats.rows.forEach(row => socket.join(`chat:${row.chat_id}`));

    // Send new message
    socket.on('message:send', async (data) => {
      try {
        const { chatId, content, type = 'text', replyTo, fileUrl, fileName, fileSize } = data;

        // Verify membership
        const member = await pool.query('SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2', [chatId, userId]);
        if (!member.rows.length) return socket.emit('error', { message: 'Not a member of this chat' });

        const result = await pool.query(
          `INSERT INTO messages (chat_id, sender_id, content, type, reply_to, file_url, file_name, file_size)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [chatId, userId, content || null, type, replyTo || null, fileUrl || null, fileName || null, fileSize || null]
        );

        const msg = result.rows[0];
        msg.sender = socket.user;

        if (replyTo) {
          const replyResult = await pool.query('SELECT id, content, sender_id FROM messages WHERE id=$1', [replyTo]);
          msg.reply_message = replyResult.rows[0] || null;
        }

        io.to(`chat:${chatId}`).emit('message:new', msg);
      } catch (err) {
        console.error('message:send error', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:start', { userId, chatId, user: socket.user });
    });

    socket.on('typing:stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:stop', { userId, chatId });
    });

    // Edit message
    socket.on('message:edit', async ({ messageId, content }) => {
      try {
        const result = await pool.query(
          `UPDATE messages SET content=$1, is_edited=true, updated_at=NOW()
           WHERE id=$2 AND sender_id=$3 AND is_deleted=false RETURNING *`,
          [content, messageId, userId]
        );
        if (result.rows.length) {
          io.to(`chat:${result.rows[0].chat_id}`).emit('message:edited', result.rows[0]);
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Delete message
    socket.on('message:delete', async ({ messageId }) => {
      try {
        const result = await pool.query(
          `UPDATE messages SET is_deleted=true, content=NULL WHERE id=$1 AND sender_id=$2 RETURNING id, chat_id`,
          [messageId, userId]
        );
        if (result.rows.length) {
          io.to(`chat:${result.rows[0].chat_id}`).emit('message:deleted', { messageId, chatId: result.rows[0].chat_id });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Reaction
    socket.on('message:react', async ({ messageId, emoji }) => {
      try {
        const msgResult = await pool.query('SELECT chat_id FROM messages WHERE id=$1', [messageId]);
        if (!msgResult.rows.length) return;

        const chatId = msgResult.rows[0].chat_id;
        const existing = await pool.query('SELECT 1 FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3', [messageId, userId, emoji]);

        if (existing.rows.length) {
          await pool.query('DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3', [messageId, userId, emoji]);
          io.to(`chat:${chatId}`).emit('message:reaction', { messageId, userId, emoji, action: 'removed' });
        } else {
          await pool.query('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3)', [messageId, userId, emoji]);
          io.to(`chat:${chatId}`).emit('message:reaction', { messageId, userId, emoji, action: 'added' });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Join new chat room (after creating a chat)
    socket.on('chat:join', ({ chatId }) => {
      socket.join(`chat:${chatId}`);
    });

    // Read receipt
    socket.on('message:read', async ({ chatId }) => {
      await pool.query('UPDATE chat_members SET last_read_at=NOW() WHERE chat_id=$1 AND user_id=$2', [chatId, userId]);
      socket.to(`chat:${chatId}`).emit('chat:read', { chatId, userId });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      await pool.query('UPDATE users SET status=$1, last_seen=NOW() WHERE id=$2', ['offline', userId]);
      io.emit('user:status', { userId, status: 'offline' });
      console.log(`🔌 User disconnected: ${socket.user.username}`);
    });
  });
};
