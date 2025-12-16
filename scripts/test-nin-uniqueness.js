#!/usr/bin/env node

/**
 * Test Script: NIN Uniqueness Constraint
 * 
 * This script tests the NIN uniqueness constraint by attempting to create
 * users with duplicate NIN numbers.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function testNinUniqueness() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test data
    const testNin = '12345678901';
    const user1Data = {
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123',
      documents: {
        nin_number: testNin
      }
    };

    const user2Data = {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123',
      documents: {
        nin_number: testNin // Same NIN - should fail
      }
    };

    console.log('🧪 Testing NIN uniqueness constraint...');

    // Clean up any existing test users
    await User.deleteMany({ 
      username: { $in: ['testuser1', 'testuser2'] } 
    });

    // Create first user - should succeed
    console.log('📝 Creating first user with NIN:', testNin);
    const user1 = new User(user1Data);
    await user1.save();
    console.log('✅ First user created successfully');

    // Try to create second user with same NIN - should fail
    console.log('📝 Attempting to create second user with same NIN...');
    try {
      const user2 = new User(user2Data);
      await user2.save();
      console.log('❌ ERROR: Second user was created (uniqueness constraint failed!)');
    } catch (error) {
      if (error.code === 11000) {
        console.log('✅ SUCCESS: Duplicate NIN rejected (uniqueness constraint working)');
        console.log('   Error message:', error.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test NIN validation
    console.log('🧪 Testing NIN validation...');
    
    const invalidNinUser = new User({
      username: 'testuser3',
      email: 'test3@example.com',
      password: 'password123',
      documents: {
        nin_number: '123' // Invalid NIN - too short
      }
    });

    try {
      await invalidNinUser.save();
      console.log('❌ ERROR: Invalid NIN was accepted');
    } catch (error) {
      console.log('✅ SUCCESS: Invalid NIN rejected');
      console.log('   Error message:', error.message);
    }

    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await User.deleteMany({ 
      username: { $in: ['testuser1', 'testuser2', 'testuser3'] } 
    });
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testNinUniqueness()
    .then(() => {
      console.log('✅ NIN uniqueness test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = testNinUniqueness;