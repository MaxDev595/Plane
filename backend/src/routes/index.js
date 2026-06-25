const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');
const messageController = require('../controllers/messageController');
const userController = require('../controllers/userController');
const uploadController = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup storage
let upload;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'plane-messenger', allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4'] },
  });
  upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
} else {
  const uploadsDir = path.join(__dirname, '../../', process.env.UPLOADS_DIR || 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
  upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
}

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', auth, authController.me);
router.patch('/auth/profile', auth, authController.updateProfile);

// User routes
router.get('/users/search', auth, userController.searchUsers);
router.get('/users/:userId', auth, userController.getUserById);

// Chat routes
router.get('/chats', auth, chatController.getMyChats);
router.post('/chats/direct', auth, chatController.createDirectChat);
router.post('/chats/group', auth, chatController.createGroupChat);
router.get('/chats/:chatId/messages', auth, chatController.getChatMessages);
router.post('/chats/:chatId/read', auth, chatController.markRead);

// Message routes
router.post('/chats/:chatId/messages', auth, messageController.sendMessage);
router.patch('/messages/:messageId', auth, messageController.editMessage);
router.delete('/messages/:messageId', auth, messageController.deleteMessage);
router.post('/messages/:messageId/reactions', auth, messageController.toggleReaction);

// Upload
router.post('/upload', auth, upload.single('file'), uploadController.uploadFile);

module.exports = router;
