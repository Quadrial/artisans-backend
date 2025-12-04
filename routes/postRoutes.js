const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getPost,
  getUserPosts,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  toggleSave,
  getSavedPosts,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

// Post CRUD
router.post('/', protect, createPost);
router.get('/', protect, getPosts);
router.get('/saved', protect, getSavedPosts);
router.get('/user/:userId?', protect, getUserPosts);
router.get('/:id', protect, getPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

// Post interactions
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comment', protect, addComment);
router.post('/:id/save', protect, toggleSave);

module.exports = router;
