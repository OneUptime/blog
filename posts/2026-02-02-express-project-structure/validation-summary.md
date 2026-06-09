# Validation Summary: How to Structure Express.js Projects for Scale

## Status
validated

## Post Type
Guide / Tutorial — architectural best practices with reference code for organizing an Express.js application.

## Technologies Covered
- Node.js
- Express.js (4.x)
- Mongoose (data layer examples)
- jsonwebtoken (JWT auth middleware)
- Joi-style validation schemas
- Helmet
- CORS middleware
- dotenv

## Sources Consulted
- Express.js official documentation — https://expressjs.com/en/4x/api.html (express.json, express.urlencoded, Router, error-handling middleware signature)
- Express.js error-handling guide — https://expressjs.com/en/guide/error-handling.html
- Mongoose docs — https://mongoosejs.com/docs/api.html (findById, findOne, create, findByIdAndUpdate, findByIdAndDelete, countDocuments, select projection)
- jsonwebtoken README — https://github.com/auth0/node-jsonwebtoken (jwt.verify usage)
- Joi API reference — https://joi.dev/api/ (schema.validate options: abortEarly, stripUnknown)
- helmet docs — https://helmetjs.github.io/
- cors middleware docs — https://github.com/expressjs/cors
- Node.js docs — https://nodejs.org/api/errors.html (Error.captureStackTrace)
- MongoDB error codes reference — duplicate key error code 11000

## Issues Found
No technical issues found. All code examples are syntactically valid and use current, non-deprecated APIs:
- `express.json()` / `express.urlencoded({ extended: true })` are the built-in body parsers (Express 4.16+).
- The error-handling middleware uses the required `(err, req, res, next)` signature and is mounted last.
- Mongoose calls (`findById`, `findByIdAndUpdate({ new: true })`, `findByIdAndDelete`, `countDocuments`) are current — `countDocuments` is correctly used instead of the deprecated `count`.
- `jwt.verify(token, secret)` is the correct synchronous API for `jsonwebtoken`.
- Joi's `schema.validate(value, { abortEarly: false, stripUnknown: true })` matches Joi 17+.
- MongoDB's duplicate key error code `11000` is correctly identified.
- The dual `module.exports = errorHandler; module.exports.AppError = AppError;` pattern is valid because functions are objects in JS; consumers can import either the default function or destructure `AppError`.
- The router pattern where `router.use(authenticate)` is placed between public and protected routes correctly applies auth to only the routes registered afterward.

## Review Notes
- `parseInt(process.env.PORT, 10) || 3000` short-circuits to `3000` if the env var is `'0'`, which is technically falsy. Acceptable for the example since port 0 is rarely intentional, but worth noting in a more defensive config.
- `const { page = 1, limit = 20 } = req.query;` leaves `page`/`limit` as strings when provided via query string. Arithmetic coerces them, but the pagination response will echo them as strings. Casting via `Number()` would tighten the contract — not an error.
- `express.urlencoded` is configured without a `limit`, so it inherits the default `'100kb'`. Symmetric with the `'10kb'` JSON limit might be preferable in production, but the example is correct as written.
- `User.findByIdAndUpdate(...)` does not run schema validators by default; a stricter example might pass `{ new: true, runValidators: true }`. The current code is valid Mongoose usage.
- The post mentions Mongoose-style models without explicitly naming Mongoose; readers using SQL/ORMs would need to translate. This is a style choice, not a correctness issue.
