# Validation Summary: How to Use Firebase Auth Token Verification in an Express.js Middleware

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Firebase Authentication
- Firebase Admin SDK for Node.js
- Express.js middleware
- Cloud Run
- Node.js
- JWT / ID token verification
- Firebase custom claims

## Sources Consulted
- Firebase Admin SDK setup documentation: https://firebase.google.com/docs/admin/setup
- Firebase Authentication: Verify ID tokens: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Firebase Authentication: Manage sessions and detect ID token revocation: https://firebase.google.com/docs/auth/admin/manage-sessions
- Firebase Authentication: Control access with custom claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Firebase Admin Node.js API reference for `verifyIdToken`, `setCustomUserClaims`, and `revokeRefreshTokens`: https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.baseauth

## Issues Found
- The post implied Firebase ID token verification avoids network calls on every request in all cases. I clarified that this is true for normal signature verification using cached Google public keys, but not when revocation checks are enabled.
- The middleware handled `auth/id-token-revoked`, but `verifyIdToken()` only returns that error when the second `checkRevoked` argument is set to `true`. I added comments explaining that revocation checks are opt-in and when that error is returned.
- The custom claims example called `revokeRefreshTokens()` with a comment saying it forces token refresh. Firebase documents that existing ID tokens can remain valid until their natural expiration and custom claims propagate when a new ID token is issued or the client forces refresh. I removed the misleading revocation call and updated the comment.
- The combined `app.js` example used `admin.auth().listUsers(100)` without importing `admin`. I added `const admin = require('./firebase');`.
- The token cache example said it used a hash as the cache key but actually used the last 20 characters of the token. I changed it to use a SHA-256 hash.
- The token cache could return a cached decoded token after the JWT's `exp` time if the token expired within the cache TTL. I added an expiration check before returning a cached token.

## Review Notes
The core approach is valid: using the Firebase Admin SDK's `verifyIdToken()` in Express middleware is supported, Cloud Run can use Application Default Credentials, and custom claims are an appropriate way to carry role information in Firebase ID tokens. For production systems that need immediate session invalidation, enable revocation checks with `verifyIdToken(idToken, true)` and account for the extra user-status/revocation lookup.
