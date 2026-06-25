const path = require('path');
const fs = require('fs');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // If Cloudinary is configured, it returns req.file.path as the URL
    if (process.env.CLOUDINARY_CLOUD_NAME && req.file.path && req.file.path.startsWith('http')) {
      return res.json({
        url: req.file.path,
        name: req.file.originalname,
        size: req.file.size,
      });
    }

    // Local storage
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
};
