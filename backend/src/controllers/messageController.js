const pool = require('../db');

exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text', replyTo, fileUrl, fileName, fileSize } = req.body;

    const member = await pool.query('SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2', [chatId, req.user.id]);
    if (!member.rows.length) return res.status(403).json({ error: 'Not a member' });

    if (!content && !fileUrl) return res.status(400).json({ error: 'Content or file required' });

    const result = await pool.query(
      `INSERT INTO messages (chat_id, sender_id, content, type, reply_to, file_url, file_name, file_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [chatId, req.user.id, content || null, type, replyTo || null, fileUrl || null, fileName || null, fileSize || null]
    );

    const msg = result.rows[0];

    // Attach sender info
    const senderResult = await pool.query(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id=$1',
      [req.user.id]
    );
    msg.sender = senderResult.rows[0];

    res.status(201).json({ message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const result = await pool.query(
      `UPDATE messages SET content=$1, is_edited=true, updated_at=NOW()
       WHERE id=$2 AND sender_id=$3 AND is_deleted=false
       RETURNING *`,
      [content, messageId, req.user.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Message not found or not yours' });
    res.json({ message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await pool.query(
      `UPDATE messages SET is_deleted=true, content=NULL WHERE id=$1 AND sender_id=$2 RETURNING id, chat_id`,
      [messageId, req.user.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Message not found' });
    res.json({ ok: true, messageId, chatId: result.rows[0].chat_id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const existing = await pool.query(
      'SELECT 1 FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
      [messageId, req.user.id, emoji]
    );

    if (existing.rows.length) {
      await pool.query('DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3', [messageId, req.user.id, emoji]);
      res.json({ action: 'removed' });
    } else {
      await pool.query('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3)', [messageId, req.user.id, emoji]);
      res.json({ action: 'added' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
