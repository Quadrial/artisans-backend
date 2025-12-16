const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['customer', 'artisan'],
      default: 'customer',
    },
    profile: {
      fullName: String,
      phone: String,
      state: String,
      city: String,
      address: String,
      profession: String,
      bio: String,
      hourlyRate: Number,
      yearsOfExperience: Number,
      skills: [String],
      profilePicture: String,
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },
    // KYC Verification with Blockchain Integration
    verification: {
      didit: {
        status: {
          type: String,
          enum: ['none', 'initiated', 'pending', 'verified', 'rejected'],
          default: 'none'
        },
        sessionId: String,
        verificationLevel: String,
        completedAt: Date,
        expiresAt: Date,
        documentType: String,
        documentCountry: String,
        riskScore: Number,
        trustScore: {
          type: Number,
          min: 0,
          max: 100,
          default: 0
        }
      },
      blockchain: {
        hash: String, // SHA256 hash of verification data
        txHash: String, // Cardano transaction hash
        blockHeight: Number,
        network: {
          type: String,
          enum: ['mainnet', 'testnet'],
          default: 'testnet'
        },
        storedAt: Date,
        verified: {
          type: Boolean,
          default: false
        }
      },
      metadata: {
        ipAddress: String,
        userAgent: String,
        deviceFingerprint: String,
        lastVerificationAttempt: Date
      }
    },
    
    // Document storage for manual NIN verification
    documents: {
      nin_number: {
        type: String,
        sparse: true, // Allow null values but enforce uniqueness when present
        unique: true, // Ensure NIN numbers are unique across all users
        validate: {
          validator: function(v) {
            // Only validate if NIN is provided
            return !v || (typeof v === 'string' && v.length === 11 && /^\d{11}$/.test(v));
          },
          message: 'NIN must be exactly 11 digits'
        }
      },
      nin_front: {
        filename: String,
        size: Number,
        mimetype: String,
        data: String // Base64 encoded image data
      },
      nin_back: {
        filename: String,
        size: Number,
        mimetype: String,
        data: String
      },
      selfie: {
        filename: String,
        size: Number,
        mimetype: String,
        data: String
      },
      video: {
        filename: String,
        size: Number,
        mimetype: String,
        data: String // Base64 encoded video data (optional)
      },
      submitted_at: Date,
      reviewed_at: Date,
      reviewed_by: {
        type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String (for admin)
        ref: 'User'
      },
      review_notes: String,
      ip_address: String,
      user_agent: String
    },
    isVerified: {
      type: Boolean,
      default: false,
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
