# How to Store Sessions in MongoDB with express-session

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Session, Express, Authentication, Cookie

Description: Learn how to configure connect-mongo as a session store for express-session, with TTL expiry, session cleanup, and production-ready cookie settings.

---

By default `express-session` stores sessions in memory, which means sessions are lost on every server restart and cannot be shared across multiple instances. Storing sessions in MongoDB with `connect-mongo` solves both problems while keeping your stack consistent.

## Installing Dependencies

```bash
npm install express express-session connect-mongo mongoose
```

## Basic Configuration

```javascript
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const app = express();

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
        autoRemove: 'native',   // Uses MongoDB TTL index
        stringify: false,        // Store session as BSON object, not JSON string
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      },
    })
  );
}

start();
```

## Understanding the Sessions Collection

MongoDB stores each session as a document with the session ID as `_id`:

```json
{
  "_id": "abc123sessionid",
  "expires": "2026-04-07T10:00:00.000Z",
  "session": {
    "cookie": { "expires": "2026-04-07T10:00:00.000Z", "httpOnly": true },
    "passport": { "user": "507f1f77bcf86cd799439011" },
    "cart": { "items": [] }
  }
}
```

## Storing Custom Data in Sessions

```javascript
app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Store data directly on the session object
  req.session.userId = user._id.toString();
  req.session.role = user.role;
  req.session.loginAt = new Date();

  res.json({ message: 'Logged in' });
});

// Read session data in subsequent requests
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ userId: req.session.userId, role: req.session.role });
});
```

## Regenerating Sessions to Prevent Fixation

Always regenerate the session ID after a privilege change:

```javascript
app.post('/elevate', (req, res) => {
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: err.message });
    req.session.adminMode = true;
    res.json({ message: 'Session elevated' });
  });
});
```

## Querying and Managing Sessions in MongoDB

```javascript
// Count active sessions
db.sessions.countDocuments({ expires: { $gt: new Date() } })

// Find all sessions for a specific user
db.sessions.find({ "session.userId": "<userId>" })

// Force logout a user by deleting their sessions
db.sessions.deleteMany({ "session.userId": "<userId>" })

// Delete all expired sessions manually (if autoRemove is disabled)
db.sessions.deleteMany({ expires: { $lt: new Date() } })
```

## Using an Existing Mongoose Connection

If you already have a Mongoose connection, reuse it instead of creating a second one:

```javascript
MongoStore.create({
  client: mongoose.connection.getClient(),
  collectionName: 'sessions',
  ttl: 86400,
})
```

## Scaling Across Multiple Instances

With MongoDB as the session store, you can run multiple Node.js processes behind a load balancer without sticky sessions. All instances read and write to the same `sessions` collection.

```bash
# Start two instances on different ports
PORT=3001 node server.js &
PORT=3002 node server.js &
```

Both instances share session state automatically.

## Summary

`connect-mongo` turns MongoDB into a production-ready session store for Express apps. Use the `native` autoRemove strategy to let MongoDB TTL indexes handle expiry cleanup automatically. Always regenerate session IDs after authentication changes, and reuse existing Mongoose connections to avoid opening duplicate database connections.
