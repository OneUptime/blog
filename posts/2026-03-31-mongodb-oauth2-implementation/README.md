# How to Implement OAuth2 with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, OAuth2, Authentication, Token, Express

Description: Learn how to implement an OAuth2 authorization server backed by MongoDB to store clients, authorization codes, and access tokens securely.

---

OAuth2 is the industry standard protocol for delegated authorization. Building your own OAuth2 server with MongoDB lets you control every aspect of your auth flow - from client registration to token lifecycle management. This guide uses the `oauth2orize` library with Express and Mongoose.

## Installing Dependencies

```bash
npm install oauth2orize passport passport-http passport-http-bearer passport-oauth2-client-password mongoose
```

## Defining MongoDB Models

### OAuth Client

```javascript
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  clientId: { type: String, required: true, unique: true },
  clientSecret: { type: String, required: true },
  redirectUris: [String],
  grants: [{ type: String, enum: ['authorization_code', 'refresh_token', 'client_credentials'] }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OAuthClient', clientSchema);
```

### Authorization Code

```javascript
const authCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  redirectUri: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scope: [String],
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

module.exports = mongoose.model('AuthCode', authCodeSchema);
```

### Access Token

```javascript
const tokenSchema = new mongoose.Schema({
  accessToken: { type: String, required: true, unique: true },
  refreshToken: String,
  clientId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scope: [String],
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index to auto-remove expired tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OAuthToken', tokenSchema);
```

## Setting Up the OAuth2 Server

```javascript
const oauth2orize = require('oauth2orize');
const crypto = require('crypto');
const AuthCode = require('./models/AuthCode');
const OAuthToken = require('./models/OAuthToken');

const server = oauth2orize.createServer();

// Authorization code grant
server.grant(
  oauth2orize.grant.code(async (client, redirectUri, user, ares, done) => {
    const code = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await AuthCode.create({ code, clientId: client.clientId, redirectUri, userId: user._id, expiresAt });
    done(null, code);
  })
);

// Exchange authorization code for access token
server.exchange(
  oauth2orize.exchange.code(async (client, code, redirectUri, done) => {
    const authCode = await AuthCode.findOne({ code, clientId: client.clientId });
    if (!authCode || authCode.expiresAt < new Date()) return done(null, false);

    await AuthCode.deleteOne({ _id: authCode._id });

    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    await OAuthToken.create({
      accessToken, refreshToken, clientId: client.clientId,
      userId: authCode.userId, expiresAt,
    });

    done(null, accessToken, refreshToken, { expires_in: 3600 });
  })
);
```

## Bearer Token Validation

```javascript
const passport = require('passport');
const BearerStrategy = require('passport-http-bearer').Strategy;

passport.use(
  new BearerStrategy(async (accessToken, done) => {
    const token = await OAuthToken.findOne({ accessToken }).populate('userId');
    if (!token || token.expiresAt < new Date()) return done(null, false);
    done(null, token.userId, { scope: token.scope });
  })
);
```

## Token Endpoint Route

```javascript
app.post(
  '/oauth/token',
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  server.token(),
  server.errorHandler()
);
```

## Querying Tokens in MongoDB

```javascript
// Find all active tokens for a user
db.oauthtokens.find({ userId: ObjectId("<userId>"), expiresAt: { $gt: new Date() } })

// Revoke all tokens for a client
db.oauthtokens.deleteMany({ clientId: "my-client-id" })
```

## Summary

Building an OAuth2 server with MongoDB gives you full control over token storage, expiration, and revocation. Use TTL indexes on `expiresAt` to automatically clean up expired codes and tokens. Store tokens as cryptographically random hex strings and always validate expiry before granting access.
