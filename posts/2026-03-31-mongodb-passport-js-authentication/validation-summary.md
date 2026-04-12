# Validation Summary: How to Use MongoDB with Passport.js for Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (ODM)
- Passport.js (authentication middleware)
- passport-local (local strategy)
- Express.js
- express-session (session middleware)
- connect-mongo (MongoDB session store)
- bcryptjs (password hashing)

## Sources Consulted
- Passport.js official documentation — https://www.passportjs.org/
- passport-local strategy docs — https://www.passportjs.org/packages/passport-local/
- connect-mongo npm documentation — https://www.npmjs.com/package/connect-mongo
- express-session documentation — https://www.npmjs.com/package/express-session
- bcryptjs npm documentation — https://www.npmjs.com/package/bcryptjs
- Mongoose documentation — https://mongoosejs.com/docs/guide.html

## Issues Found
No technical issues found.

## Review Notes
- The `const bcrypt = require('bcryptjs')` import in the "Registration and Login Routes" section is unused since password hashing is done via the `User.hashPassword()` static method. This is not technically wrong but is unnecessary dead code.
- The login route uses `passport.authenticate('local')` as middleware without a `failWithError` or custom callback, which means authentication failures return a plain 401 rather than a JSON error body. This is acceptable but worth noting for readers building JSON APIs who may want structured error responses.
- The `req.logout(callback)` usage with a callback is correct for Passport.js 0.6+, which made the callback mandatory. Older tutorials omit it, so this post correctly reflects the current API.
- Session query examples use MongoDB shell syntax with dot notation into `session.passport.user`, which is correct because connect-mongo v4+ stores session data as native BSON objects by default (not stringified JSON).
