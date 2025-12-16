#!/usr/bin/env node

/**
 * Database Migration Script: Add Unique Index for NIN Numbers
 * 
 * This script adds a unique sparse index to the documents.nin_number field
 * to prevent duplicate NIN usage across user accounts.
 * 
 * Usage: node scripts/add-nin-unique-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function addNinUniqueIndex() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check if index already exists
    const existingIndexes = await usersCollection.indexes();
    const ninIndexExists = existingIndexes.some(index => 
      index.key && index.key['documents.nin_number']
    );

    if (ninIndexExists) {
      console.log('ℹ️  NIN unique index already exists');
    } else {
      console.log('📝 Creating unique sparse index for documents.nin_number...');
      
      // Create unique sparse index
      await usersCollection.createIndex(
        { 'documents.nin_number': 1 },
        { 
          unique: true, 
          sparse: true, // Only index documents that have nin_number field
          name: 'documents_nin_number_unique'
        }
      );
      
      console.log('✅ Successfully created unique index for NIN numbers');
    }

    // Check for duplicate NIN numbers
    console.log('🔍 Checking for existing duplicate NIN numbers...');
    const duplicates = await usersCollection.aggregate([
      {
        $match: {
          'documents.nin_number': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$documents.nin_number',
          count: { $sum: 1 },
          users: { $push: { id: '$_id', username: '$username', email: '$email' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate NIN numbers:');
      duplicates.forEach(dup => {
        console.log(`   NIN: ${dup._id} (${dup.count} users)`);
        dup.users.forEach(user => {
          console.log(`     - ${user.username} (${user.email})`);
        });
      });
      console.log('⚠️  Please resolve duplicates manually before enforcing uniqueness');
    } else {
      console.log('✅ No duplicate NIN numbers found');
    }

    // Get statistics
    const totalUsers = await usersCollection.countDocuments();
    const usersWithNin = await usersCollection.countDocuments({
      'documents.nin_number': { $exists: true, $ne: null }
    });

    console.log('\n📊 Statistics:');
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Users with NIN: ${usersWithNin}`);
    console.log(`   Users without NIN: ${totalUsers - usersWithNin}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   This is a duplicate key error. Please resolve duplicate NIN numbers first.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  addNinUniqueIndex()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addNinUniqueIndex;