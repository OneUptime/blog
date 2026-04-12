# How to Store User Credentials Securely in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Authentication, Password, Bcrypt

Description: Learn secure patterns for storing user credentials in MongoDB using bcrypt password hashing, field-level encryption, and access control best practices.

---

## Introduction

Storing user credentials incorrectly is one of the most damaging security mistakes an application can make. MongoDB provides no automatic password hashing, so your application must hash passwords before storage. This guide covers bcrypt hashing, schema design for credentials, and additional security controls to protect user accounts.

## Never Store Plaintext Passwords

Always hash passwords with a slow, adaptive algorithm like bcrypt before inserting:

```javascript
const bcrypt = require("bcrypt")
const { MongoClient, ObjectId } = require("mongodb")

const SALT_ROUNDS = 12 // Higher = slower = more secure

async function createUser(email, password, name) {
  // Hash password before storing
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const result = await db.collection("users").insertOne({
    email: email.toLowerCase().trim(),
    passwordHash,       // NEVER store the raw password
    name,
    createdAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
    emailVerified: false,
    twoFactorEnabled: false
  })

  return result.insertedId
}
```

## Verifying Passwords

```javascript
async function verifyCredentials(email, password) {
  const user = await db.collection("users").findOne({
    email: email.toLowerCase().trim()
  })

  if (!user) {
    // Use constant-time comparison to prevent timing attacks
    await bcrypt.compare(password, "$2b$12$invalidHashForTimingAttackProtection.0000000000000000")
    return null
  }

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error("Account locked. Try again later.")
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)

  if (!isValid) {
    // Increment failed attempts and lock if threshold reached
    const attempts = user.failedLoginAttempts + 1
    const update = { $inc: { failedLoginAttempts: 1 } }

    if (attempts >= 5) {
      update.$set = { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }
    }

    await db.collection("users").updateOne({ _id: user._id }, update)
    return null
  }

  // Reset on successful login
  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } }
  )

  return user
}
```

## Password Change Flow

```javascript
async function changePassword(userId, currentPassword, newPassword) {
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) })

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isValid) throw new Error("Invalid current password")

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: newHash,
        passwordChangedAt: new Date()
      }
    }
  )
}
```

## Secure MongoDB Schema Design

```javascript
// Create a restricted projection for public user data
async function getUserPublicProfile(userId) {
  return db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    // NEVER return passwordHash in API responses
    {
      projection: {
        passwordHash: 0,
        twoFactorSecret: 0,
        passwordResetToken: 0,
        failedLoginAttempts: 0
      }
    }
  )
}
```

## MongoDB Index for Email Uniqueness

```javascript
await db.collection("users").createIndex(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
)
```

## Summary

Secure credential storage in MongoDB requires bcrypt hashing with a cost factor of at least 12, never storing plaintext passwords or returning password hashes in API responses, and implementing account lockout on repeated failures. Use strict projection in all user queries to prevent accidentally exposing sensitive fields. For additional security, consider MongoDB's Client-Side Field Level Encryption (CSFLE) to encrypt the `passwordHash` field at rest.
