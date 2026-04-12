# Validation Summary: How to Implement OAuth2 with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes, Mongoose ODM)
- OAuth2 (authorization code grant flow)
- Node.js / Express
- oauth2orize
- Passport.js (passport-http, passport-http-bearer, passport-oauth2-client-password)

## Sources Consulted
- oauth2orize documentation: https://github.com/jaredhanson/oauth2orize
- Mongoose schema and index documentation: https://mongoosejs.com/docs/guide.html
- MongoDB TTL index documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- passport-http-bearer documentation: https://github.com/jaredhanson/passport-http-bearer
- passport-oauth2-client-password documentation: https://github.com/jaredhanson/passport-oauth2-client-password
- Node.js crypto module documentation: https://nodejs.org/api/crypto.html

## Issues Found
1. **`crypto` listed in npm install command**: `crypto` is a built-in Node.js module and should not be installed via npm. The npm `crypto` package is unrelated/deprecated. Removed it from the install command.
2. **Missing `passport-oauth2-client-password` dependency**: The token endpoint route uses `passport.authenticate(['basic', 'oauth2-client-password'], ...)`, which requires the `passport-oauth2-client-password` package. This package was not listed in the npm install command. Added it.

## Review Notes
- The post correctly uses TTL indexes with `expireAfterSeconds: 0` on Date fields to auto-clean expired auth codes and tokens — this is a well-known MongoDB pattern.
- The inline TTL index syntax on the AuthCode schema (`index: { expireAfterSeconds: 0 }` in the Mongoose schema path) works but is less conventional than using `schema.index()` as done for the token schema. Both approaches are valid.
- The oauth2orize callback functions use `async` but also call `done()` — this works because oauth2orize supports both patterns, but mixing async/await with callback-style `done()` could confuse readers. Not a correctness issue, just a style observation.
- Client secrets are stored in plaintext in the schema. In production, these should be hashed (e.g., with bcrypt). The post doesn't claim to be production-ready, so this is not flagged as an error, but worth noting.
