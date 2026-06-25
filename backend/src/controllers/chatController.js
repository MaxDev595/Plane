const pool = require('../db');

exports.getMyChats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.type, c.name, c.description, c.avatar_url, c.created_at,
        cm.last_read_at,
        (
          SELECT json_build_object(
            'id', m.id, 'content', m.content, 'type', m.type,
            'file_url', m.file_url, 'created_at', m.created_at,
            'sender_id', m.sender_id, 'is_deleted', m.is_deleted
          )
          FROM messages m WHERE m.chat_id = c.id AND m.is_deleted = false
          ORDER BY m.created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*) FROM messages m2
          WHERE m2.chat_id = c.id AND m2.created_at > cm.last_read_at AND m2.sender_id != $1 AND m2.is_deleted = false
        )::int as unread_count,
        (
          SELECT json_agg(json_build_object(
            'id', u.id, 'username', u.username, 'display_name', u.display_name,
            'avatar_url', u.avatar_url, 'status', u.status
          ))
          FROM chat_members cm2
          JOIN users u ON u.id = cm2.user_id
          WHERE cm2.chat_id = c.id
        ) as members
      FROM chats c
      JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1
      ORDER BY (
        SELECT created_at FROM messages m WHERE m.chat_id = c.id ORDER BY created_at DESC LIMIT 1
      ) DESC NULLS LAST
    `, [req.user.id]);

    res.json({ chats: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createDirectChat = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot chat with yourself' });

    // Check if direct chat already exists
    const existing = await pool.query(`
      SELECT c.id FROM chats c
      JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
      JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
      WHERE c.type = 'direct'
      LIMIT 1
    `, [req.user.id, userId]);

    if (existing.rows.length) {
      return res.json({ chatId: existing.rows[0].id });
    }

    const chatResult = await pool.query(
      'INSERT INTO chats (type, created_by) VALUES ($1, $2) RETURNING id',
      ['direct', req.user.id]
    );
    const chatId = chatResult.rows[0].id;

    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1,$2,$3),($1,$4,$3)',
      [chatId, req.user.id, 'member', userId]
    );

    res.status(201).json({ chatId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createGroupChat = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name required' });

    const chatResult = await pool.query(
      'INSERT INTO chats (type, name, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id',
      ['group', name, description || '', req.user.id]
    );
    const chatId = chatResult.rows[0].id;

    const allMembers = [...new Set([req.user.id, ...(memberIds || [])])];
    for (const uid of allMembers) {
      const role = uid === req.user.id ? 'owner' : 'member';
      await pool.query('INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1,$2,$3)', [chatId, uid, role]);
    }

    res.status(201).json({ chatId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify membership
    const member = await pool.query('SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2', [chatId, req.user.id]);
    if (!member.rows.length) return res.status(403).json({ error: 'Not a member' });

    let query = `
      SELECT m.*, 
        json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url) as sender,
        (SELECT json_build_object('id', rm.id, 'content', rm.content, 'sender_id', rm.sender_id) FROM messages rm WHERE rm.id = m.reply_to) as reply_message,
        (SELECT json_agg(json_build_object('emoji', r.emoji, 'user_id', r.user_id)) FROM message_reactions r WHERE r.message_id = m.id) as reactions
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.chat_id = $1
    `;
    const params = [chatId];

    if (before) {
      params.push(before);
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $${params.length})`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    const messages = result.rows.reverse();

    // Update last_read
    await pool.query(
      'UPDATE chat_members SET last_read_at = NOW() WHERE chat_id=$1 AND user_id=$2',
      [chatId, req.user.id]
    );

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    await pool.query(
      'UPDATE chat_members SET last_read_at = NOW() WHERE chat_id=$1 AND user_id=$2',
      [chatId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
