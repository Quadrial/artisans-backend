const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['work', 'job'], // 'work' for artisans, 'job' for customers
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    images: [{
      type: String, // Base64 or URL
    }],
    skills: [{
      type: String,
      trim: true,
    }],
    // For artisan work posts
    priceRange: {
      min: Number,
      max: Number,
    },
    // For customer job posts
    budget: {
      min: Number,
      max: Number,
    },
    location: {
      state: String,
      city: String,
      address: String,
    },
    // Job specific fields
    deadline: Date,
    jobType: {
      type: String,
      enum: ['one-time', 'ongoing', 'contract'],
    },
    // Engagement metrics
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    saves: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    shares: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    views: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'active',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ type: 1, status: 1, createdAt: -1 });
postSchema.index({ skills: 1 });
postSchema.index({ 'location.state': 1, 'location.city': 1 });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Ensure virtuals are included in JSON
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
