# How to Store Refresh Tokens in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Authentication, Token, JWT, Security

Description: Learn how to securely store, rotate, and revoke JWT refresh tokens in MongoDB with family tracking to prevent token reuse attacks.

---

Refresh tokens are long-lived credentials that let clients obtain new access tokens without re-authenticating. Storing them in MongoDB gives you the ability to revoke specific tokens, detect reuse attacks, and implement token rotation - none of which are possible with stateless JWTs alone.

## Defining the Refresh Token Model

```javascript
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  family: {
    type: String,
    required: true,
    index: true,
  },
  used: { type: Boolean, default: false },
  replacedBy: String,
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  userAgent: String,
  ipAddress: String,
});

// TTL index - MongoDB auto-deletes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
```

## Issuing Tokens on Login

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('./models/RefreshToken');

async function issueTokenPair(userId, req) {
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const family = crypto.randomBytes(20).toString('hex'); // new family for new login

  await RefreshToken.create({
    token: rawRefreshToken,
    userId,
    family,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  return { accessToken, refreshToken: rawRefreshToken };
}
```

## Rotating Refresh Tokens

Implement rotation: each use invalidates the old token and issues a new one. If a used token is presented again, revoke the entire family.

```javascript
async function rotateRefreshToken(oldToken, req) {
  const tokenDoc = await RefreshToken.findOne({ token: oldToken });

  if (!tokenDoc) throw new Error('Invalid refresh token');

  // Detect reuse attack - invalidate entire family
  if (tokenDoc.used) {
    await RefreshToken.deleteMany({ family: tokenDoc.family });
    throw new Error('Token reuse detected - all sessions revoked');
  }

  if (tokenDoc.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ _id: tokenDoc._id });
    throw new Error('Refresh token expired');
  }

  const newRawToken = crypto.randomBytes(40).toString('hex');

  // Mark old token as used
  await RefreshToken.updateOne(
    { _id: tokenDoc._id },
    { $set: { used: true, replacedBy: newRawToken } }
  );

  // Issue new token in same family
  await RefreshToken.create({
    token: newRawToken,
    userId: tokenDoc.userId,
    family: tokenDoc.family,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  const accessToken = jwt.sign({ sub: tokenDoc.userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });

  return { accessToken, refreshToken: newRawToken };
}
```

## Revoking Tokens on Logout

```javascript
// Logout from current device
async function logout(refreshToken) {
  await RefreshToken.deleteOne({ token: refreshToken });
}

// Logout from all devices
async function logoutAll(userId) {
  await RefreshToken.deleteMany({ userId });
}
```

## Querying Active Sessions

```javascript
// Show active sessions for a user
db.refreshtokens.find(
  { userId: ObjectId("<userId>"), used: false, expiresAt: { $gt: new Date() } },
  { userAgent: 1, ipAddress: 1, createdAt: 1, expiresAt: 1 }
)
```

## Summary

MongoDB is an ideal store for refresh tokens because it supports TTL indexes for automatic expiry, fast lookups by token value or user ID, and atomic updates for rotation. Implement token family tracking to detect reuse attacks and revoke entire session chains when suspicious activity is detected.
