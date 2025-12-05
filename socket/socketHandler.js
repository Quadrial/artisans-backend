const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const userSockets = new Map(); // Map userId to socketId

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins with their ID
    socket.on('join', (userId) => {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
      console.log(`User ${userId} joined with socket ${socket.id}`);
    });

    // Send message
    socket.on('sendMessage', async (data) => {
      try {
        const { receiverId, content, senderId, type = 'text', attachments = [] } = data;

        // Get or create conversation
        const conversation = await Conversation.getOrCreate(senderId, receiverId);

        // Create message
        const message = await Message.create({
          conversation: conversation._id,
          sender: senderId,
          receiver: receiverId,
          content,
          type,
          attachments,
        });

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        
        // Increment unread count for receiver
        const currentUnread = conversation.unreadCount.get(receiverId) || 0;
        conversation.unreadCount.set(receiverId, currentUnread + 1);
        
        await conversation.save();

        // Populate message
        await message.populate([
          { path: 'sender', select: 'username profile.profilePicture profile.fullName' },
          { path: 'receiver', select: 'username profile.profilePicture profile.fullName' },
        ]);

        // Send to sender
        socket.emit('messageSent', message);

        // Send to receiver if online
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newMessage', message);
        }

        console.log(`Message sent from ${senderId} to ${receiverId}`);
      } catch (error) {
        console.error('Socket send message error:', error);
        socket.emit('messageError', { error: error.message });
      }
    });

    // Mark messages as read
    socket.on('markAsRead', async (data) => {
      try {
        const { conversationId, userId } = data;

        await Message.updateMany(
          {
            conversation: conversationId,
            receiver: userId,
            isRead: false,
          },
          {
            isRead: true,
            readAt: new Date(),
          }
        );

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.unreadCount.set(userId, 0);
          await conversation.save();
        }

        socket.emit('messagesRead', { conversationId });
      } catch (error) {
        console.error('Socket mark as read error:', error);
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { receiverId, senderId } = data;
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', { userId: senderId });
      }
    });

    socket.on('stopTyping', (data) => {
      const { receiverId, senderId } = data;
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userStoppedTyping', { userId: senderId });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        console.log(`User ${socket.userId} disconnected`);
      }
    });
  });
};

module.exports = setupSocket;
