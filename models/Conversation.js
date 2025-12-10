const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only two participants and unique conversations
conversationSchema.index({ participants: 1 }, { unique: true });

// Method to get or create conversation
conversationSchema.statics.getOrCreate = async function(userId1, userId2) {
  // Prevent self-conversations
  if (userId1 === userId2) {
    throw new Error('Cannot create conversation with yourself');
  }

  const participants = [userId1, userId2].sort();
  
  let conversation = await this.findOne({
    participants: { $all: participants, $size: 2 }
  });

  if (!conversation) {
    conversation = await this.create({
      participants,
      unreadCount: new Map([
        [userId1, 0],
        [userId2, 0]
      ])
    });
  }

  return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);
