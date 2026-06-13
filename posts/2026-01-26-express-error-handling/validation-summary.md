# Validation Summary: How to Implement Error Handling in Express

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Express.js
- Node.js
- JavaScript
- Express middleware
- REST API error handling
- Mongoose error conversion
- JSON Web Token error conversion

## Sources Consulted
- Express official error handling guide: https://expressjs.com/en/guide/error-handling/
- Express official middleware guide: https://expressjs.com/en/guide/using-middleware/
- Express 5.1 release and LTS post: https://expressjs.com/en/blog/2025-03-31-v5-1-latest-release/
- Express package metadata: https://www.npmjs.com/package/express
- Node.js process documentation: https://nodejs.org/api/process.html
- Node.js errors documentation: https://nodejs.org/api/errors.html
- Mongoose validation documentation: https://mongoosejs.com/docs/validation.html
- jsonwebtoken package documentation: https://www.npmjs.com/package/jsonwebtoken

## Issues Found
- The post stated broadly that Express does not catch async errors automatically. This is accurate for Express 4, but not for Express 5. Updated the explanation to specify Express 4 and note that Express 5 automatically calls `next(error)` for rejected promises returned by route handlers or middleware.
- The `app.js` example used `ForbiddenError` but did not import it. Added `ForbiddenError` to the destructured import from `./errors/AppError`.
- The later `server.js` example required `./app` and called `app.listen()`, but the `app.js` example started the server directly and did not export the Express app. Replaced the direct `app.listen()` in `app.js` with `module.exports = app` so the `server.js` example works as written.

## Review Notes
- The route examples still rely on application-specific helper functions such as `findUserById`, `isValidEmail`, `createUser`, and `deleteUser`. They are clearly illustrative placeholders, not Express APIs.
- `Error.captureStackTrace()` is available in Node.js through V8, but it is not a cross-runtime JavaScript standard API.
