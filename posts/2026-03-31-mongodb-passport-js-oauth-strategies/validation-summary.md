# Validation Summary: How to Use Passport.js OAuth Strategies with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose ODM
- Passport.js
- passport-google-oauth20
- passport-github2
- express-session
- connect-mongo
- Express.js
- OAuth 2.0

## Sources Consulted
- Passport.js official documentation — https://www.passportjs.org/
- passport-google-oauth20 npm package — https://www.npmjs.com/package/passport-google-oauth20
- passport-github2 npm package — https://www.npmjs.com/package/passport-github2
- Mongoose documentation (Schema types, indexes, queries) — https://mongoosejs.com/docs/guide.html
- connect-mongo npm package — https://www.npmjs.com/package/connect-mongo
- express-session npm package — https://www.npmjs.com/package/express-session

## Issues Found
- **Missing install command for `passport-github2`**: The "Adding Multiple OAuth Providers" section used `require('passport-github2')` but never included an install command for the package. A reader following the tutorial sequentially would encounter a "module not found" error. Added `npm install passport-github2` before the GitHub strategy code block.

## Review Notes
- The schema uses `sparse: true` on `googleId` and `githubId` without `unique: true`. While technically valid, the typical pattern for OAuth provider IDs is `{ type: String, unique: true, sparse: true }` to prevent duplicate provider IDs while allowing multiple documents to omit the field. Without `unique`, duplicate provider IDs could theoretically be inserted.
- The GitHub strategy callback lacks try/catch error handling, unlike the Google strategy callback. An error in the `findOneAndUpdate` call would result in an unhandled promise rejection rather than being passed to `done(err)`.
- GitHub profiles may have private emails, making `profile.emails` null or empty. The optional chaining (`profile.emails?.[0]?.value`) handles this gracefully at the access level, but since `email` is `required: true` in the schema, the upsert could fail for users with private GitHub emails. Note that `findOneAndUpdate` does not run Mongoose validators by default, so the document would be created with a missing email, which could cause issues downstream.
