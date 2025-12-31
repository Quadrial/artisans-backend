const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      profile: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      state,
      city,
      address,
      profession,
      bio,
      hourlyRate,
      yearsOfExperience,
      skills,
      latitude,
      longitude,
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update profile fields individually to avoid location validation issues
    if (fullName !== undefined) user.profile.fullName = fullName;
    if (phone !== undefined) user.profile.phone = phone;
    if (state !== undefined) user.profile.state = state;
    if (city !== undefined) user.profile.city = city;
    if (address !== undefined) user.profile.address = address;
    if (profession !== undefined) user.profile.profession = profession;
    if (bio !== undefined) user.profile.bio = bio;
    if (hourlyRate !== undefined) user.profile.hourlyRate = hourlyRate;
    if (yearsOfExperience !== undefined) user.profile.yearsOfExperience = yearsOfExperience;
    if (skills !== undefined) user.profile.skills = skills;
    
    // Update location coordinates if provided
    if (latitude !== undefined && longitude !== undefined) {
      user.profile.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get another user's public profile
// @route   GET /api/profile/user/:userId
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      profile: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isVerified: user.verification?.didit?.status === 'verified',
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Upload profile photo
// @route   POST /api/profile/upload-photo
// @access  Private
exports.uploadProfilePhoto = async (req, res) => {
  try {
    const { photoData } = req.body;

    if (!photoData) {
      return res.status(400).json({
        success: false,
        message: 'No photo data provided',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Store base64 image data (in production, upload to cloud storage like Cloudinary/AWS S3)
    user.profile.profilePicture = photoData;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profile.profilePicture,
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
