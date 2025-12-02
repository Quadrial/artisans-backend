const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('\n📝 Please check:');
    console.error('   1. MongoDB Atlas connection string is correct');
    console.error('   2. Username and password are correct');
    console.error('   3. IP address is whitelisted in MongoDB Atlas');
    console.error('   4. Network connection is stable\n');
    process.exit(1);
  }
};

module.exports = connectDB;
