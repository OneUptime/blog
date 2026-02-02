# How to Implement OAuth2 in Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, OAuth2, Passport, Authentication

Description: Learn how to implement OAuth2 authentication in Express using Passport.js for Google, GitHub, Facebook, and other OAuth providers.

---

OAuth2 lets users sign in to your app using their existing accounts from Google, GitHub, or other providers. No more password management headaches, and users get a familiar login experience. This guide covers setting up Passport.js with OAuth2 strategies in Express, handling callbacks, and managing user sessions.

## Why OAuth2?

Building your own authentication system means handling password hashing, reset flows, and security vulnerabilities. OAuth2 offloads this to providers who specialize in security. Your users trust Google or GitHub with their credentials, and you get verified user data without storing sensitive passwords.

## Project Setup

Start with a fresh Express project and install the required dependencies:

```bash
npm init -y
npm install express passport passport-google-oauth20 passport-github2 express-session dotenv
```

Create your environment file to store OAuth credentials:

```bash
# .env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
SESSION_SECRET=your-session-secret
```

## Basic Express Setup with Sessions

Passport needs sessions to persist login state across requests. Here is the foundation:

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();

// Session configuration - required for Passport to remember logged-in users
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport and restore session
app.use(passport.initialize());
app.use(passport.session());

// Serialize user to session - stores user ID in the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session - retrieves full user from database
passport.deserializeUser(async (id, done) => {
  try {
    // Replace with your database lookup
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = app;
```

## Configuring OAuth Strategies

Each OAuth provider requires its own Passport strategy. Here is a comparison of the main providers:

| Provider | Strategy Package | Scopes Available | Use Case |
|----------|-----------------|------------------|----------|
| Google | passport-google-oauth20 | profile, email, openid | General apps, workspace integration |
| GitHub | passport-github2 | user, user:email, repo | Developer tools, code-related apps |
| Facebook | passport-facebook | email, public_profile | Consumer apps, social features |
| Twitter | passport-twitter | users.read, tweet.read | Social apps, marketing tools |

### Google OAuth Strategy

```javascript
// strategies/google.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists in database
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // User exists, return them
        return done(null, user);
      }

      // Create new user from Google profile data
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0]?.value
      });

      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));
```

### GitHub OAuth Strategy

```javascript
// strategies/github.js
const GitHubStrategy = require('passport-github2').Strategy;
const passport = require('passport');
const User = require('../models/User');

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback',
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });

      if (user) {
        return done(null, user);
      }

      // GitHub may not return email directly - need to fetch it
      const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;

      user = await User.create({
        githubId: profile.id,
        email: email,
        name: profile.displayName || profile.username,
        avatar: profile.photos[0]?.value
      });

      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));
```

## Setting Up Auth Routes

The OAuth flow needs two routes per provider: one to initiate login, and one to handle the callback.

```javascript
// routes/auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    failureMessage: true
  }),
  (req, res) => {
    // Successful authentication, redirect to dashboard
    res.redirect('/dashboard');
  }
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login',
    failureMessage: true
  }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Logout route - destroys session
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;
```

## Protecting Routes with Middleware

Create middleware to restrict access to authenticated users:

```javascript
// middleware/auth.js

// Ensures user is logged in
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Please log in to access this resource' });
}

// Ensures user is NOT logged in (for login pages)
function ensureGuest(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
}

module.exports = { ensureAuthenticated, ensureGuest };
```

Use the middleware on protected routes:

```javascript
// routes/dashboard.js
const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const router = express.Router();

// All routes in this file require authentication
router.use(ensureAuthenticated);

router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to your dashboard',
    user: req.user
  });
});

router.get('/settings', (req, res) => {
  res.json({ settings: req.user.settings });
});

module.exports = router;
```

## Storing Access Tokens

Sometimes you need the OAuth access token to make API calls on behalf of the user. Store it during authentication:

```javascript
// Modified strategy to save tokens
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOneAndUpdate(
        { googleId: profile.id },
        {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          // Store tokens for later API calls
          accessToken: accessToken,
          refreshToken: refreshToken
        },
        { upsert: true, new: true }
      );

      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));
```

## Putting It All Together

Here is the complete app entry point:

```javascript
// server.js
const app = require('./app');
require('./strategies/google');
require('./strategies/github');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

// Mount routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

// Home page
app.get('/', (req, res) => {
  res.json({
    message: 'OAuth2 Demo',
    loginLinks: {
      google: '/auth/google',
      github: '/auth/github'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Registering OAuth Apps

Before testing, you need to register your app with each provider:

**Google**: Go to the Google Cloud Console, create a project, enable the Google+ API, and create OAuth credentials. Add `http://localhost:3000/auth/google/callback` as an authorized redirect URI.

**GitHub**: Go to GitHub Settings > Developer Settings > OAuth Apps. Create a new app with `http://localhost:3000/auth/github/callback` as the callback URL.

## Common Issues and Fixes

**Callback URL mismatch**: Make sure your registered callback URL exactly matches what your app sends. Even trailing slashes matter.

**Session not persisting**: Check that `express-session` is configured before `passport.initialize()`. Order matters in Express middleware.

**User not found after login**: Ensure `deserializeUser` correctly fetches the user from your database. Log the ID to debug.

**HTTPS required in production**: Google requires HTTPS for OAuth callbacks in production. Use a reverse proxy like nginx to handle SSL.

## Wrapping Up

OAuth2 with Passport.js gives you a solid authentication foundation. Start with one provider, get it working, then add others. The pattern stays the same - just swap out the strategy and callback URL. Your users get a seamless login experience, and you skip the security headaches of managing passwords yourself.
