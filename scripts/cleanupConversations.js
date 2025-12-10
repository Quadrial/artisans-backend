const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
require('dotenv').config();

async function cleanupInvalidConversations() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find conversations where a user is talking to themselves
    const invalidConversations = await Conversation.find({
      $expr: {
        $eq: [
          { $arrayElemAt: ["$participants", 0] },
          { $arrayElemAt: ["$participants", 1] }
        ]
      }
    });

    console.log(`Found ${invalidConversations.length} invalid conversations`);

    if (invalidConversations.length > 0) {
      // Delete invalid conversations
      const result = await Conversation.deleteMany({
        _id: { $in: invalidConversations.map(c => c._id) }
      });
      
      console.log(`Deleted ${result.deletedCount} invalid conversations`);
    }

    // Also find conversations with only one participant
    const singleParticipantConversations = await Conversation.find({
      $expr: { $lt: [{ $size: "$participants" }, 2] }
    });

    console.log(`Found ${singleParticipantConversations.length} conversations with single participant`);

    if (singleParticipantConversations.length > 0) {
      const result2 = await Conversation.deleteMany({
        _id: { $in: singleParticipantConversations.map(c => c._id) }
      });
      
      console.log(`Deleted ${result2.deletedCount} single participant conversations`);
    }

    console.log('Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupInvalidConversations();