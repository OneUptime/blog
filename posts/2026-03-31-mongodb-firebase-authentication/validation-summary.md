# Validation Summary: How to Use MongoDB with Firebase Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (with Mongoose ODM)
- Firebase Authentication (Firebase Admin SDK for Node.js)
- Node.js / Express.js
- JWT (Firebase ID tokens)

## Sources Consulted
- Firebase Admin SDK documentation — `verifyIdToken()`, `revokeRefreshTokens()`, `deleteUser()`: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Firebase Admin SDK setup with service account credentials: https://firebase.google.com/docs/admin/setup
- Firebase ID token claims (uid, email, name, picture, email_verified): https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.decodedidtoken
- Mongoose `findOneAndUpdate` with upsert: https://mongoosejs.com/docs/api/model.html#Model.findOneAndUpdate()
- Mongoose `findByIdAndUpdate`, `deleteOne`: https://mongoosejs.com/docs/api/model.html
- MongoDB `$set`, `$setOnInsert` update operators: https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB aggregation `$group` and `$sort` stages: https://www.mongodb.com/docs/manual/reference/operator/aggregation/

## Issues Found
No technical issues found.

## Review Notes
- The `firebaseUid` field has both `unique: true` and `index: true` in the Mongoose schema. The `unique` option already creates a unique index, so `index: true` is redundant. This is not incorrect — Mongoose handles it gracefully — but could be simplified.
- The middleware performs a MongoDB upsert on every authenticated request. This is a valid pattern for keeping user data in sync but could be a performance consideration for high-traffic applications. The post does not claim this is optimized for high scale, so this is acceptable for a tutorial.
- The PATCH `/api/profile` endpoint does not validate or sanitize `req.body` input. This is typical for tutorial code and not a technical error, but production code would want input validation.
