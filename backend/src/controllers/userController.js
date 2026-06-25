const pool = require('../db');

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const result = await pool.query(
      `SELECT id, username, display_name, avatar_url, status FROM users
       WHERE (username ILIKE $1 OR display_name ILIKE $1) AND id != $2
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, bio, avatar_url, status, last_seen FROM users WHERE id=$1',
      [req.params.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
