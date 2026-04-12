# Validation Summary: How to Implement Magic Link Authentication with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes)
- Mongoose ODM (schema definition, `expires` option, `findOneAndDelete`)
- Node.js `crypto` module (`randomBytes`)
- Express.js (routing)
- jsonwebtoken (`jwt.sign`)

## Sources Consulted
- Mongoose Schema Types documentation — `expires` option and TTL index creation: https://mongoosejs.com/docs/schematypes.html
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- Node.js `crypto.randomBytes` documentation: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
- Mongoose `findOneAndDelete` documentation: https://mongoosejs.com/docs/api/model.html#Model.findOneAndDelete()
- jsonwebtoken npm package documentation: https://github.com/auth0/node-jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback
- `ms` npm package (used internally by Mongoose for time string parsing): https://github.com/vercel/ms

## Issues Found
No technical issues found.

## Review Notes
- `deleteOne({ email })` is used to clean up existing tokens before creating a new one. In the normal sequential flow this is correct since there should be at most one token per email. However, `deleteMany({ email })` would be more defensive against race conditions where concurrent requests could create multiple tokens for the same email. Not a bug in the described flow, but worth noting for production hardening.
- The verify route passes the JWT session token as a URL query parameter (`res.redirect('/dashboard?token=${sessionToken}')`). This is a common tutorial pattern, but in production the token should ideally be set as an HTTP-only cookie to avoid exposure in browser history, server logs, and Referer headers.
- MongoDB's TTL monitor thread runs approximately every 60 seconds, so there is a window where a document may persist slightly beyond its expiration time. The code correctly handles this by using `findOneAndDelete` for token consumption rather than relying solely on TTL for invalidation.
- The post does not include email input validation on the route handler. In production, the email should be validated and normalized before processing.
