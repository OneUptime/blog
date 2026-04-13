# How to Use MongoDB with Auth0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Auth0, Authentication, JWT, Express

Description: Learn how to integrate Auth0 with MongoDB to sync user profiles, validate JWTs, and store application-specific user data alongside Auth0 identity data.

---

Auth0 handles the complexity of authentication while MongoDB stores your application-specific user data. The key is synchronizing Auth0 user profiles with your own MongoDB documents using the Auth0 `sub` field as a stable identifier.

## Installing Dependencies

```bash
npm install express express-oauth2-jwt-bearer mongoose axios
```

## Validating Auth0 JWTs in Express

```javascript
const { auth } = require('express-oauth2-jwt-bearer');

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256',
});

// Apply to protected routes
app.use('/api', checkJwt);
```

## Defining the MongoDB User Model

Store application data linked to the Auth0 subject identifier:

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  auth0Id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
  name: String,
  picture: String,
  // Application-specific fields
  role: { type: String, enum: ['viewer', 'editor', 'admin'], default: 'viewer' },
  preferences: {
    theme: { type: String, default: 'light' },
    notifications: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
});

module.exports = mongoose.model('User', userSchema);
```

## Adding Profile Claims to the Access Token

By default, Auth0 access tokens only contain the `sub` claim to identify the user. To include `email`, `name`, and `picture` in the access token, create an Auth0 Action with the **Post Login** trigger:

```javascript
// Auth0 Action: Add profile claims to access token
exports.onExecutePostLogin = async (event, api) => {
  api.accessToken.setCustomClaim('email', event.user.email);
  api.accessToken.setCustomClaim('name', event.user.name);
  api.accessToken.setCustomClaim('picture', event.user.picture);
};
```

## Syncing Auth0 Users to MongoDB

Create or update the MongoDB user document on each authenticated request using a middleware:

```javascript
const User = require('./models/User');

async function syncUser(req, res, next) {
  const auth0Id = req.auth.payload.sub;

  try {
    const user = await User.findOneAndUpdate(
      { auth0Id },
      {
        $set: {
          email: req.auth.payload.email,
          name: req.auth.payload.name,
          picture: req.auth.payload.picture,
          lastLogin: new Date(),
        },
        $setOnInsert: { auth0Id, role: 'viewer' },
      },
      { upsert: true, new: true }
    );

    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

app.use('/api', checkJwt, syncUser);
```

## Using Auth0 Management API to Sync Metadata

Pull user metadata from Auth0 when needed:

```javascript
const axios = require('axios');

async function getAuth0UserMetadata(auth0Id) {
  const tokenRes = await axios.post(
    `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      client_id: process.env.AUTH0_MGMT_CLIENT_ID,
      client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
      audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials',
    }
  );

  const mgmtToken = tokenRes.data.access_token;

  const userRes = await axios.get(
    `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0Id)}`,
    { headers: { Authorization: `Bearer ${mgmtToken}` } }
  );

  return userRes.data;
}
```

## Protecting Routes with Role Checks

```javascript
function requireRole(role) {
  return (req, res, next) => {
    if (!req.dbUser || req.dbUser.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.get('/api/admin/users', checkJwt, syncUser, requireRole('admin'), async (req, res) => {
  const users = await User.find().select('-__v');
  res.json(users);
});
```

## Querying MongoDB for User Analytics

```javascript
// Count users by role
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
])

// Find users who have not logged in for 30 days
db.users.find({
  lastLogin: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
})
```

## Summary

MongoDB complements Auth0 by storing application-specific user data that doesn't belong in the identity provider. Use the Auth0 `sub` claim as the primary key linking both systems, and sync user documents via upsert on each authenticated request. This keeps your MongoDB user collection consistent without requiring webhook infrastructure.
