const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverLetter: {
      type: String,
      required: [true, 'Please provide a cover letter'],
      maxlength: [1000, 'Cover letter cannot exceed 1000 characters'],
    },
    proposedPrice: {
      type: Number,
      required: [true, 'Please provide your proposed price'],
    },
    estimatedDuration: {
      type: String,
      required: [true, 'Please provide estimated duration'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    portfolio: [{
      type: String, // URLs or base64 images
    }],
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
jobApplicationSchema.index({ job: 1, artisan: 1 }, { unique: true }); // One application per artisan per job
jobApplicationSchema.index({ job: 1, status: 1 });
jobApplicationSchema.index({ artisan: 1, status: 1 });
jobApplicationSchema.index({ customer: 1, status: 1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
