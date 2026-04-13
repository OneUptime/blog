# How to Build a User Management System with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, User Management, Schema Design, Authentication, Node.js

Description: Learn how to design and build a user management system with MongoDB including registration, authentication, roles, and profile management.

---

## Schema Design

A user management system needs to handle registration, authentication tokens, roles, and profile data. MongoDB's flexible document model lets you embed related data while keeping the schema queryable.

```javascript
// User document structure
{
  _id: ObjectId("..."),
  email: "alice@example.com",         // unique, required
  passwordHash: "$2b$12$...",          // bcrypt hash
  profile: {
    name: "Alice Smith",
    avatarUrl: "https://...",
    timezone: "America/New_York",
    bio: "Developer"
  },
  roles: ["member"],                   // can include "admin", "moderator"
  isActive: true,
  isEmailVerified: false,
  emailVerificationToken: "abc123",
  passwordResetToken: null,
  passwordResetExpiresAt: null,
  lastLoginAt: ISODate("2026-03-01"),
  createdAt: ISODate("2026-01-01"),
  updatedAt: ISODate("2026-03-01")
}
```

## Creating the Collection with Validation and Indexes

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);

async function setupUsers(db) {
  await db.createCollection('users', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'passwordHash'],
        properties: {
          email: { bsonType: 'string', pattern: '^[^@]+@[^@]+$' },
          roles: { bsonType: 'array', items: { bsonType: 'string' } },
          isActive: { bsonType: 'bool' },
        },
      },
    },
  });

  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ emailVerificationToken: 1 }, { sparse: true });
  await users.createIndex({ passwordResetToken: 1 }, { sparse: true });
  await users.createIndex({ createdAt: 1 });
}
```

## Registration

```javascript
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function registerUser(db, { email, password, name }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  const result = await db.collection('users').insertOne({
    email: email.toLowerCase().trim(),
    passwordHash,
    profile: { name },
    roles: ['member'],
    isActive: true,
    isEmailVerified: false,
    emailVerificationToken,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { userId: result.insertedId, emailVerificationToken };
}
```

## Authentication

```javascript
async function loginUser(db, { email, password }) {
  const user = await db.collection('users').findOne(
    { email: email.toLowerCase().trim(), isActive: true },
    { projection: { passwordHash: 1, roles: 1, profile: 1 } }
  );

  if (!user) throw new Error('Invalid credentials');

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new Error('Invalid credentials');

  // Update lastLoginAt
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
  );

  return { userId: user._id, roles: user.roles, name: user.profile.name };
}
```

## Password Reset Flow

```javascript
async function initiatePasswordReset(db, email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

  const result = await db.collection('users').updateOne(
    { email: email.toLowerCase().trim(), isActive: true },
    { $set: { passwordResetToken: token, passwordResetExpiresAt: expiresAt } }
  );

  if (result.matchedCount === 0) throw new Error('User not found');
  return token;
}

async function resetPassword(db, { token, newPassword }) {
  const user = await db.collection('users').findOne({
    passwordResetToken: token,
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!user) throw new Error('Invalid or expired token');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: { passwordHash, updatedAt: new Date() },
      $unset: { passwordResetToken: '', passwordResetExpiresAt: '' },
    }
  );
}
```

## Summary

A MongoDB user management system benefits from a flexible document schema that embeds profile data, stores role arrays, and uses sparse indexes for optional token fields. Use bcrypt for password hashing, enforce email uniqueness with a unique index, and apply TTL indexes or explicit expiry checks for verification and reset tokens to prevent stale tokens from accumulating.
