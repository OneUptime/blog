# Validation Summary: How to Build a User Management System with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, `$jsonSchema` validation, indexes, CRUD operations)
- Node.js MongoDB driver (`mongodb` npm package)
- bcrypt (`bcrypt` npm package) for password hashing
- Node.js `crypto` module for token generation

## Sources Consulted
- MongoDB $jsonSchema validation documentation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB Node.js driver `createCollection` API: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB `createIndex` options (unique, sparse): https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB `$unset` operator: https://www.mongodb.com/docs/manual/reference/operator/update/unset/
- bcrypt npm package API: https://www.npmjs.com/package/bcrypt
- Node.js `crypto.randomBytes` documentation: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback

## Issues Found
1. **Inconsistent email normalization across functions**: `registerUser` normalized emails with `email.toLowerCase().trim()`, but `loginUser` and `initiatePasswordReset` only used `email.toLowerCase()` without `.trim()`. This would cause login and password reset failures if a user's input contained leading or trailing whitespace, since the stored email was trimmed on registration but not trimmed on lookup. Fixed by adding `.trim()` to the email normalization in both `loginUser` and `initiatePasswordReset`.

## Review Notes
- The summary mentions "TTL indexes" as an option for token expiry, but the code only implements explicit expiry checks (comparing `passwordResetExpiresAt` with `$gt: new Date()`). This is not wrong since the summary frames it as "TTL indexes or explicit expiry checks," but readers looking for a TTL index example won't find one in the code.
- The `initiatePasswordReset` function throws `'User not found'` when no matching user is found, which could enable user enumeration in a production system. This is acceptable for a tutorial but worth noting for production hardening.
- The bcrypt cost factor of 12 is a reasonable choice for current hardware.
- All MongoDB driver APIs (`insertOne`, `findOne`, `updateOne`, `createIndex`, `createCollection`) are used correctly and are current with the MongoDB Node.js driver v5+/v6+.
