# How to Use argon2 for Password Hashing with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Argon2, Password, Security, Authentication

Description: Learn how to use argon2 - the winner of the Password Hashing Competition - for secure password storage in MongoDB with Node.js.

---

## Overview

argon2 won the Password Hashing Competition in 2015 and is now the recommended algorithm by OWASP for new applications. It offers three variants (argon2d, argon2i, argon2id) with configurable memory, time, and parallelism parameters, making it more resistant to GPU-based brute-force attacks than bcrypt.

## Installation

```bash
npm install argon2 mongoose
```

Note: `argon2` requires a native build. Ensure you have a C++ compiler available or use a Docker image with build tools.

## argon2 Variants

- **argon2d** - Maximizes resistance to GPU attacks, but vulnerable to side-channel attacks. Not recommended for password hashing.
- **argon2i** - Resistant to side-channel attacks. Recommended for password hashing.
- **argon2id** - Hybrid approach, resistant to both. The OWASP-recommended default.

## Basic Hashing and Verification

```javascript
const argon2 = require('argon2');

// Hash a password using argon2id (default)
async function hashPassword(plaintext) {
  return argon2.hash(plaintext, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MB
    timeCost: 3,        // 3 iterations
    parallelism: 4,     // 4 threads
  });
}

// Verify a password
async function verifyPassword(hash, plaintext) {
  return argon2.verify(hash, plaintext);
}

// Usage
const hash = await hashPassword('mySecretPassword');
console.log(hash);
// $argon2id$v=19$m=65536,t=3,p=4$...

const isValid = await verifyPassword(hash, 'mySecretPassword');
console.log(isValid); // true
```

## OWASP-Recommended Parameters

OWASP recommends the following minimum parameters for argon2id:

```javascript
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,  // 19 MB minimum
  timeCost: 2,        // 2 iterations minimum
  parallelism: 1,
};
```

For higher security applications, increase `memoryCost` to 64 MB or more.

## Mongoose Integration

```javascript
// models/User.js
const mongoose = require('mongoose');
const argon2   = require('argon2');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await argon2.hash(this.password, ARGON2_OPTIONS);
  next();
});

userSchema.methods.verifyPassword = function (plaintext) {
  return argon2.verify(this.password, plaintext);
};

// Rehash if parameters have been upgraded
userSchema.methods.needsRehash = function () {
  return argon2.needsRehash(this.password, ARGON2_OPTIONS);
};

module.exports = mongoose.model('User', userSchema);
```

## Rehashing on Login for Parameter Upgrades

When you increase security parameters, rehash the password transparently at login:

```javascript
async function login(email, plaintext) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials');

  const isValid = await user.verifyPassword(plaintext);
  if (!isValid) throw new Error('Invalid credentials');

  // Upgrade hash parameters if needed
  if (user.needsRehash()) {
    user.password = plaintext; // Pre-save hook will rehash
    await user.save();
  }

  return user;
}
```

## Migrating from bcrypt to argon2

```javascript
// During login, if the hash starts with $2b$ it is bcrypt - migrate it
const bcrypt = require('bcrypt');
const argon2 = require('argon2');

async function loginWithMigration(email, plaintext) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new Error('Invalid credentials');

  let isValid;
  if (user.password.startsWith('$2b$')) {
    isValid = await bcrypt.compare(plaintext, user.password);
    if (isValid) {
      // Rehash with argon2 via pre-save hook
      user.password = plaintext;
      await user.save();
    }
  } else {
    isValid = await argon2.verify(user.password, plaintext);
  }

  if (!isValid) throw new Error('Invalid credentials');
  return user;
}
```

## Summary

argon2id is the current best practice for password hashing. It outperforms bcrypt in resistance to GPU attacks by consuming configurable amounts of memory. Integrate it with MongoDB via Mongoose's pre-save hook and implement transparent rehashing on login to upgrade parameters without disrupting users. The migration pattern allows you to move an existing bcrypt user base to argon2 gradually.
