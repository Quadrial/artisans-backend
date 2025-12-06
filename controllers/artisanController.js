const User = require('../models/User');

// @desc    Get all artisans with filters
// @route   GET /api/artisans
// @access  Public
exports.getArtisans = async (req, res) => {
  try {
    const { 
      search, 
      skills, 
      state, 
      city, 
      minRate, 
      maxRate,
      minExperience,
      sort = '-createdAt',
      page = 1, 
      limit = 20 
    } = req.query;

    // Build query
    const query = { 
      role: 'artisan',
      isActive: true,
    };

    // Search by name, profession, or skills
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { 'profile.fullName': { $regex: search, $options: 'i' } },
        { 'profile.profession': { $regex: search, $options: 'i' } },
        { 'profile.skills': { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Filter by skills
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query['profile.skills'] = { $in: skillsArray };
    }

    // Filter by location
    if (state) {
      query['profile.state'] = state;
    }
    if (city) {
      query['profile.city'] = city;
    }

    // Filter by hourly rate
    if (minRate || maxRate) {
      query['profile.hourlyRate'] = {};
      if (minRate) query['profile.hourlyRate'].$gte = parseFloat(minRate);
      if (maxRate) query['profile.hourlyRate'].$lte = parseFloat(maxRate);
    }

    // Filter by experience
    if (minExperience) {
      query['profile.yearsOfExperience'] = { $gte: parseInt(minExperience) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const artisans = await User.find(query)
      .select('username email profile isVerified createdAt')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      artisans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get artisans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get artisan by ID
// @route   GET /api/artisans/:id
// @access  Public
exports.getArtisanById = async (req, res) => {
  try {
    const artisan = await User.findOne({
      _id: req.params.id,
      role: 'artisan',
      isActive: true,
    }).select('username email profile isVerified createdAt');

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan not found',
      });
    }

    res.status(200).json({
      success: true,
      artisan,
    });
  } catch (error) {
    console.error('Get artisan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get unique skills from all artisans
// @route   GET /api/artisans/skills/list
// @access  Public
exports.getSkills = async (req, res) => {
  try {
    const skills = await User.distinct('profile.skills', {
      role: 'artisan',
      isActive: true,
    });

    res.status(200).json({
      success: true,
      skills: skills.filter(skill => skill), // Remove null/undefined
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get unique locations from all artisans
// @route   GET /api/artisans/locations/list
// @access  Public
exports.getLocations = async (req, res) => {
  try {
    const states = await User.distinct('profile.state', {
      role: 'artisan',
      isActive: true,
    });

    const cities = await User.distinct('profile.city', {
      role: 'artisan',
      isActive: true,
    });

    res.status(200).json({
      success: true,
      states: states.filter(state => state),
      cities: cities.filter(city => city),
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
