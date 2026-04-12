# How to Implement Two-Factor Authentication with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Authentication, TOTP, Security, Two-Factor

Description: Learn how to implement TOTP-based two-factor authentication with MongoDB, storing secrets and managing 2FA state per user with speakeasy and QR codes.

---

## Overview

Two-factor authentication (2FA) adds a second verification step beyond the password. The most common implementation uses Time-based One-Time Passwords (TOTP) compatible with apps like Google Authenticator and Authy. This guide covers storing 2FA secrets in MongoDB and managing the enrollment and verification flow.

## Installation

```bash
npm install speakeasy qrcode mongoose
```

## User Schema with 2FA Fields

```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:         { type: String, required: true, unique: true },
  password:      { type: String, required: true, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret:  { type: String, select: false },
  backupCodes:   { type: [String], select: false },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
```

The `select: false` on sensitive fields prevents them from being returned in normal queries.

## Generating a 2FA Secret (Enrollment)

```javascript
const speakeasy = require('speakeasy');
const QRCode    = require('qrcode');

async function initiate2FA(userId) {
  const secret = speakeasy.generateSecret({
    name: 'MyApp',
    length: 20,
  });

  // Store the base32 secret temporarily (not enabled yet)
  await User.findByIdAndUpdate(userId, {
    twoFactorSecret: secret.base32,
    twoFactorEnabled: false,
  });

  // Generate a QR code the user can scan with their authenticator app
  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  return { secret: secret.base32, qrDataUrl };
}
```

## Verifying and Activating 2FA

```javascript
async function confirm2FA(userId, token) {
  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user || !user.twoFactorSecret) {
    throw new Error('2FA setup not initiated');
  }

  const isValid = speakeasy.totp.verify({
    secret:   user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 1, // Allow 1 period of clock drift
  });

  if (!isValid) throw new Error('Invalid TOTP token');

  await User.findByIdAndUpdate(userId, { twoFactorEnabled: true });
  return { success: true };
}
```

## Login with 2FA Verification

```javascript
async function login(email, password, totpToken) {
  const user = await User.findOne({ email }).select('+password +twoFactorSecret');
  if (!user) throw new Error('Invalid credentials');

  const bcrypt = require('bcrypt');
  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) throw new Error('Invalid credentials');

  if (user.twoFactorEnabled) {
    if (!totpToken) throw new Error('2FA token required');

    const isValid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    totpToken,
      window: 1,
    });

    if (!isValid) throw new Error('Invalid 2FA token');
  }

  return user;
}
```

## Storing Backup Codes

Provide backup codes in case the user loses access to their authenticator:

```javascript
const crypto = require('crypto');

async function generateBackupCodes(userId) {
  const codes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // Hash backup codes before storing
  const bcrypt = require('bcrypt');
  const hashed = await Promise.all(codes.map(c => bcrypt.hash(c, 10)));

  await User.findByIdAndUpdate(userId, { backupCodes: hashed });

  return codes; // Return plain codes once - user must save them
}
```

## Disabling 2FA

```javascript
async function disable2FA(userId, token) {
  const user = await User.findById(userId).select('+twoFactorSecret');
  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret, encoding: 'base32', token, window: 1,
  });
  if (!isValid) throw new Error('Invalid token');

  await User.findByIdAndUpdate(userId, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
  });
}
```

## Summary

Implementing TOTP-based 2FA with MongoDB involves generating a per-user secret with speakeasy, storing it securely with `select: false`, and verifying tokens on login. Always verify a token before activating 2FA to ensure the user's authenticator app is correctly configured. Store backup codes as bcrypt hashes and invalidate them after use to provide account recovery without compromising security.
