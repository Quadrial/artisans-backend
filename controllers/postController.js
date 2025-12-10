const Post = require('../models/Post');
const User = require('../models/User');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { title, description, images, skills, priceRange, budget, location, deadline, jobType, type } = req.body;

    // Validate post type
    // Note: Both artisans and customers can post 'work' type (regular posts)
    // Only customers can post 'job' type
    if (type === 'job' && req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can post jobs',
      });
    }

    const post = await Post.create({
      user: req.user.id,
      type,
      title,
      description,
      images: images || [],
      skills: skills || [],
      priceRange,
      budget,
      location,
      deadline,
      jobType,
    });

    // Populate user details
    await post.populate('user', 'username email role profile.profilePicture profile.fullName');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post,
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all posts (feed)
// @route   GET /api/posts
// @access  Private
exports.getPosts = async (req, res) => {
  try {
    const { type, skills, state, city, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const query = { status: 'active', isActive: true };

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by skills
    if (skills) {
      const skillsArray = skills.split(',');
      query.skills = { $in: skillsArray };
    }

    // Filter by location
    if (state) {
      query['location.state'] = state;
    }
    if (city) {
      query['location.city'] = city;
    }

    const skip = (page - 1) * limit;

    const posts = await Post.find(query)
      .populate('user', 'username email role profile.profilePicture profile.fullName profile.state profile.city')
      .populate('comments.user', 'username profile.profilePicture profile.fullName')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username email role profile.profilePicture profile.fullName profile.state profile.city profile.phone')
      .populate('comments.user', 'username profile.profilePicture profile.fullName');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user's posts
// @route   GET /api/posts/user/:userId
// @access  Private
exports.getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    const posts = await Post.find({ user: userId, isActive: true })
      .populate('user', 'username email role profile.profilePicture profile.fullName')
      .populate('comments.user', 'username profile.profilePicture profile.fullName')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Check ownership
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post',
      });
    }

    const { title, description, images, skills, priceRange, budget, location, deadline, jobType, status } = req.body;

    post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        images,
        skills,
        priceRange,
        budget,
        location,
        deadline,
        jobType,
        status,
      },
      { new: true, runValidators: true }
    ).populate('user', 'username email role profile.profilePicture profile.fullName');

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post,
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Check ownership
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post',
      });
    }

    // Soft delete
    post.isActive = false;
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Like/Unlike post
// @route   POST /api/posts/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const likeIndex = post.likes.indexOf(req.user.id);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      liked: likeIndex === -1,
      likeCount: post.likes.length,
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Add comment to post
// @route   POST /api/posts/:id/comment
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    post.comments.push({
      user: req.user.id,
      text: text.trim(),
    });

    await post.save();
    
    // Re-populate all comments with user data
    await post.populate({
      path: 'comments.user',
      select: 'username profile.profilePicture profile.fullName'
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comments: post.comments,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Save/Unsave post
// @route   POST /api/posts/:id/save
// @access  Private
exports.toggleSave = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const saveIndex = post.saves.indexOf(req.user.id);

    if (saveIndex > -1) {
      // Unsave
      post.saves.splice(saveIndex, 1);
    } else {
      // Save
      post.saves.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      saved: saveIndex === -1,
    });
  } catch (error) {
    console.error('Toggle save error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get saved posts
// @route   GET /api/posts/saved
// @access  Private
exports.getSavedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ saves: req.user.id, isActive: true })
      .populate('user', 'username email role profile.profilePicture profile.fullName')
      .populate('comments.user', 'username profile.profilePicture profile.fullName')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
