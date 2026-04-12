# How to Use Passport.js OAuth Strategies with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Passport.js, OAuth, Authentication, Strategy

Description: Learn how to configure Passport.js OAuth strategies with MongoDB to store and look up users authenticated via Google, GitHub, or other providers.

---

## Overview

Passport.js supports dozens of OAuth providers through strategy packages. When a user authenticates via OAuth (Google, GitHub, etc.), Passport calls a `verify` callback where you look up or create a user in MongoDB. This guide covers setting up an OAuth strategy with MongoDB using the Mongoose ODM.

## Installation

```bash
npm install passport passport-google-oauth20 mongoose express-session connect-mongo
```

## User Schema

```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId:    { type: String, sparse: true },
  githubId:    { type: String, sparse: true },
  email:       { type: String, required: true, unique: true },
  displayName: String,
  photo:       String,
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
```

## Configuring the Google Strategy

```javascript
// config/passport.js
const passport   = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  '/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Find by email in case user signed up with another method
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            googleId:    profile.id,
            email:       profile.emails[0].value,
            displayName: profile.displayName,
            photo:       profile.photos[0]?.value,
          });
        }
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));
```

## Serializing Users to Session

```javascript
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
```

## Express App Setup

```javascript
// app.js
const express   = require('express');
const session   = require('express-session');
const MongoStore = require('connect-mongo');
const passport  = require('passport');
const mongoose  = require('mongoose');

require('./config/passport');

const app = express();

mongoose.connect(process.env.MONGODB_URI);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
}));

app.use(passport.initialize());
app.use(passport.session());

// OAuth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
);
```

## Adding Multiple OAuth Providers

```bash
npm install passport-github2
```

```javascript
// Add GitHub strategy
const { Strategy: GitHubStrategy } = require('passport-github2');

passport.use(new GitHubStrategy(
  {
    clientID:     process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL:  '/auth/github/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    let user = await User.findOneAndUpdate(
      { githubId: profile.id },
      { $setOnInsert: { githubId: profile.id, email: profile.emails?.[0]?.value, displayName: profile.displayName } },
      { upsert: true, new: true }
    );
    return done(null, user);
  }
));
```

## Summary

Passport.js OAuth strategies integrate cleanly with MongoDB by performing upsert logic in the `verify` callback. The pattern is consistent across all providers: find or create the user in MongoDB using the provider's unique ID, then serialize the MongoDB document ID to the session. Store sessions in MongoDB using `connect-mongo` for persistence across server restarts.
