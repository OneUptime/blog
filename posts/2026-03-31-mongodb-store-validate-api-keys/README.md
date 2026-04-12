# How to Store and Validate API Keys in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, API Key, Security, Authentication, Token

Description: Learn how to securely generate, store hashed API keys in MongoDB, and validate them efficiently on every request using prefix-based lookup.

---

## Overview

API keys are long-lived credentials that allow programmatic access to your API. Storing them securely requires hashing (like passwords), but API keys have a unique challenge: you need to look up a key without knowing which user it belongs to. The prefix pattern solves this efficiently.

## The Prefix Pattern

Store each API key as two parts:
- **Prefix** - The first 8 characters (stored in plain text for lookup)
- **Hash** - A bcrypt hash of the full key (stored for verification)

This lets you find the correct key record with an indexed lookup on the prefix, then verify against the hash.

## API Key Schema

```javascript
// models/ApiKey.js
const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true },      // Human-readable label
  prefix:    { type: String, required: true, index: true }, // First 8 chars, plain text
  keyHash:   { type: String, required: true },      // bcrypt hash of full key
  lastUsed:  { type: Date },
  expiresAt: { type: Date },                         // Optional expiry
  createdAt: { type: Date, default: Date.now },
});

// TTL index to auto-delete expired keys
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('ApiKey', apiKeySchema);
```

## Generating an API Key

```javascript
const crypto = require('crypto');
const bcrypt = require('bcrypt');

async function generateApiKey(userId, name, expiresInDays = null) {
  // Generate a 32-byte random key and encode as hex
  const rawKey = 'sk_' + crypto.randomBytes(32).toString('hex');
  const prefix = rawKey.substring(0, 8);

  // Hash the full key
  const keyHash = await bcrypt.hash(rawKey, 10);

  const keyData = {
    userId,
    name,
    prefix,
    keyHash,
  };

  if (expiresInDays) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    keyData.expiresAt = expiresAt;
  }

  await ApiKey.create(keyData);

  // Return the raw key ONCE - it cannot be recovered later
  return rawKey;
}
```

## Validating an API Key on Each Request

```javascript
async function validateApiKey(rawKey) {
  if (!rawKey || rawKey.length < 8) throw new Error('Invalid API key format');

  const prefix = rawKey.substring(0, 8);

  // Use the index to find candidate records
  const candidates = await ApiKey.find({
    prefix,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  }).select('+keyHash');

  // Verify each candidate (usually just one)
  for (const candidate of candidates) {
    const isValid = await bcrypt.compare(rawKey, candidate.keyHash);
    if (isValid) {
      // Update last used timestamp asynchronously
      ApiKey.updateOne({ _id: candidate._id }, { lastUsed: new Date() }).exec();
      return candidate;
    }
  }

  throw new Error('Invalid or expired API key');
}
```

## Express Middleware

```javascript
async function apiKeyMiddleware(req, res, next) {
  const rawKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');

  if (!rawKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const keyRecord = await validateApiKey(rawKey);
    req.userId = keyRecord.userId;
    req.apiKey = keyRecord;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid API key' });
  }
}
```

## Listing and Revoking Keys

```javascript
// List all keys for a user (never show the raw key)
async function listApiKeys(userId) {
  return ApiKey.find({ userId }).select('-keyHash').sort({ createdAt: -1 });
}

// Revoke a specific key
async function revokeApiKey(keyId, userId) {
  const result = await ApiKey.deleteOne({ _id: keyId, userId });
  if (result.deletedCount === 0) throw new Error('Key not found');
}
```

## Summary

Storing API keys in MongoDB securely requires hashing the full key while preserving a plain-text prefix for efficient indexed lookup. Use `bcrypt.hash()` for storing and `bcrypt.compare()` for verification. The prefix-based lookup pattern keeps validation fast without exposing the full key. Always return the raw key only at generation time and immediately update `lastUsed` on successful validation for audit purposes.
