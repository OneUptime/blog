# Validation Summary: How to Store Refresh Tokens in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes, document queries)
- Mongoose ODM (schema definition, model methods)
- Node.js (crypto module)
- jsonwebtoken (JWT signing)
- Express.js (request object: req.ip, req.headers)
- OAuth 2.0 refresh token rotation pattern

## Sources Consulted
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- Mongoose Schema documentation: https://mongoosejs.com/docs/guide.html
- Mongoose SchemaTypes (unique, index): https://mongoosejs.com/docs/schematypes.html
- Node.js crypto.randomBytes documentation: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
- jsonwebtoken npm package API: https://github.com/auth0/node-jsonwebtoken
- IETF OAuth 2.0 Security Best Current Practice (refresh token rotation and reuse detection): https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics

## Issues Found
- **Unused `crypto` import in schema definition**: The first code block (Defining the Refresh Token Model) imported `const crypto = require('crypto')` but never used it within that block. The `crypto` module is only used in subsequent code blocks (issueTokenPair, rotateRefreshToken). Removed the unused import to avoid confusing readers.

## Review Notes
- **Refresh tokens stored in plain text**: The tokens are stored as plain text in MongoDB. Best practice (per OWASP) is to hash tokens (e.g., SHA-256) before storage so that a database breach does not directly expose usable tokens. This is a design consideration rather than a code error, but worth noting for security-conscious readers.
- **Rotation is not fully atomic**: The `rotateRefreshToken` function performs separate `findOne`, `updateOne`, and `create` operations. Under concurrent requests with the same token, a race condition could allow two requests to pass the `used` check before either marks the token as used. Using `findOneAndUpdate` or a MongoDB transaction would make this safer. The summary paragraph's mention of "atomic updates for rotation" is slightly misleading in this context, though individual MongoDB document operations are indeed atomic.
- **Redundant index on `token` field**: The schema specifies both `unique: true` and `index: true` on the `token` field. Since `unique` automatically creates a unique index, the explicit `index: true` is redundant. This causes no errors but is unnecessary.
