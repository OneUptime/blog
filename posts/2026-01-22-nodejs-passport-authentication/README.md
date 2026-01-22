# How to Use Passport.js for Authentication in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Passport, Authentication, OAuth, Express

Description: Learn how to implement authentication in Node.js using Passport.js with local strategy, OAuth providers (Google, GitHub), JWT, and session management.

---

Passport.js is the most popular authentication middleware for Node.js. It supports over 500 authentication strategies including local username/password, OAuth providers, and JWT.

## Installation

```bash
npm install passport passport-local passport-jwt express-session bcrypt
```

## Basic Setup

### Initialize Passport

```javascript
const express = require('express');
const passport = require('passport');
const session = require('express-session');

const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});
```

## Local Strategy (Username/Password)

### Configuration

```javascript
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

passport.use(new LocalStrategy({
  usernameField: 'email',     // Default is 'username'
  passwordField: 'password',
}, async (email, password, done) => {
  try {
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));
```

### Login Route

```javascript
app.post('/login', 
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,  // Requires connect-flash
  })
);

// Or with custom handling
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({ error: info.message });
    }
    
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json({ user: { id: user.id, email: user.email } });
    });
  })(req, res, next);
});
```

### Registration

```javascript
app.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await User.create({
      email,
      name,
      password: hashedPassword,
    });
    
    // Log in the user
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ user: { id: user.id, email: user.email } });
    });
  } catch (error) {
    next(error);
  }
});
```

### Logout

```javascript
app.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: 'Logged out successfully' });
  });
});
```

## JWT Strategy

```bash
npm install passport-jwt
```

### Configuration

```javascript
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  issuer: 'myapp.com',
  audience: 'myapp.com',
};

passport.use(new JwtStrategy(options, async (payload, done) => {
  try {
    const user = await User.findById(payload.sub);
    
    if (!user) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));
```

### Protected Routes

```javascript
const jwt = require('jsonwebtoken');

// Generate token on login
app.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message });
    
    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ token, user: { id: user.id, email: user.email } });
  })(req, res, next);
});

// Protected route
app.get('/profile',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({ user: req.user });
  }
);
```

### Multiple JWT Sources

```javascript
const options = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    // Try header first
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    // Then try query parameter
    ExtractJwt.fromUrlQueryParameter('token'),
    // Then try cookie
    (req) => req.cookies?.jwt,
  ]),
  secretOrKey: process.env.JWT_SECRET,
};
```

## OAuth Strategies

### Google OAuth

```bash
npm install passport-google-oauth20
```

```javascript
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user
    let user = await User.findOne({ googleId: profile.id });
    
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0]?.value,
      });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Routes
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
  }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);
```

### GitHub OAuth

```bash
npm install passport-github2
```

```javascript
const GitHubStrategy = require('passport-github2').Strategy;

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: '/auth/github/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ githubId: profile.id });
    
    if (!user) {
      user = await User.create({
        githubId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        username: profile.username,
        avatar: profile.photos[0]?.value,
      });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Routes
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);
```

## Authentication Middleware

### Require Authentication

```javascript
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Usage
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.json({ user: req.user });
});
```

### Require Role

```javascript
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Usage
app.get('/admin', requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin panel' });
});

app.get('/manage', requireRole('admin', 'manager'), (req, res) => {
  res.json({ message: 'Management panel' });
});
```

## Multiple Strategies

```javascript
// Allow either session or JWT authentication
function flexAuth(req, res, next) {
  // Try session first
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Try JWT
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
      return next();
    }
    
    res.status(401).json({ error: 'Authentication required' });
  })(req, res, next);
}
```

## Linking Multiple Providers

```javascript
// Link Google account to existing user
app.get('/link/google',
  ensureAuthenticated,
  passport.authorize('google', { scope: ['profile', 'email'] })
);

app.get('/link/google/callback',
  passport.authorize('google', { failureRedirect: '/settings' }),
  async (req, res) => {
    // req.account contains the Google profile
    // req.user contains the logged-in user
    await User.findByIdAndUpdate(req.user.id, {
      googleId: req.account.id,
    });
    res.redirect('/settings');
  }
);

// Configure strategy for authorization
passport.use('google-authz', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/link/google/callback',
  passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
  // Check if Google account already linked
  const existingUser = await User.findOne({ googleId: profile.id });
  if (existingUser && existingUser.id !== req.user.id) {
    return done(null, false, { message: 'Google account already linked' });
  }
  return done(null, profile);
}));
```

## Session Store with Redis

```bash
npm install connect-redis ioredis
```

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
```

## Complete Example

```javascript
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// User model (simplified)
const users = [];

// Serialize/Deserialize
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

// Local Strategy
passport.use(new LocalStrategy({
  usernameField: 'email',
}, async (email, password, done) => {
  const user = users.find(u => u.email === email);
  if (!user) return done(null, false, { message: 'Invalid credentials' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return done(null, false, { message: 'Invalid credentials' });
  
  return done(null, user);
}));

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
}, (payload, done) => {
  const user = users.find(u => u.id === payload.sub);
  return done(null, user || false);
}));

// Routes
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = { id: users.length + 1, email, password: hashedPassword };
  users.push(user);
  res.status(201).json({ id: user.id, email: user.email });
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message });
    
    req.logIn(user, (err) => {
      if (err) return next(err);
      
      const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: { id: user.id, email: user.email } });
    });
  })(req, res, next);
});

app.get('/profile',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({ user: { id: req.user.id, email: req.user.email } });
  }
);

app.listen(3000);
```

## Summary

| Strategy | Use Case |
|----------|----------|
| Local | Username/password authentication |
| JWT | Stateless API authentication |
| Google | Social login with Google |
| GitHub | Social login for developers |
| Facebook | Social login with Facebook |

| Method | Description |
|--------|-------------|
| `passport.authenticate()` | Authenticate request |
| `req.login()` | Establish login session |
| `req.logout()` | Terminate session |
| `req.isAuthenticated()` | Check if authenticated |
| `passport.authorize()` | Link additional account |

Best practices:
- Use secure session configuration in production
- Store sessions in Redis for scalability
- Implement proper error handling
- Use HTTPS for all auth routes
- Hash passwords with bcrypt (cost 12+)
- Implement rate limiting on login routes
