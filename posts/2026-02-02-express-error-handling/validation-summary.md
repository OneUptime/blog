# Validation Summary: How to Handle Error Handling Properly in Express

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express.js (v4 patterns, also compatible with v5)
- JavaScript (ES2015+ classes, async/await)
- Mongoose (validation, CastError, duplicate key handling)
- jsonwebtoken (JWT error types)
- Winston (logging)

## Sources Consulted
- Express error-handling documentation: https://expressjs.com/en/guide/error-handling.html
- Node.js Error API (Error.captureStackTrace): https://nodejs.org/api/errors.html#errorcapturestacktracetargetobject-constructoropt
- Node.js process events (unhandledRejection, uncaughtException): https://nodejs.org/api/process.html
- RFC 9110 (HTTP Semantics) for status codes: https://www.rfc-editor.org/rfc/rfc9110.html
- Mongoose error documentation: https://mongoosejs.com/docs/api/error.html
- MongoDB error codes (E11000 duplicate key): https://www.mongodb.com/docs/manual/reference/error-codes/
- jsonwebtoken README (JsonWebTokenError, TokenExpiredError): https://github.com/auth0/node-jsonwebtoken
- Winston 3.x documentation: https://github.com/winstonjs/winston
- JSend response specification: https://github.com/omniti-labs/jsend

## Issues Found
No technical issues found.

The post is accurate across all major claims:
- The `AppError` base class correctly uses `Error.captureStackTrace(this, this.constructor)` (a valid V8 API) and the JSend convention of `fail` for 4xx and `error` for 5xx.
- The async wrapper `Promise.resolve(fn(req, res, next)).catch(next)` is the canonical pattern for forwarding async errors to Express 4's error-handling middleware.
- The error middleware signature `(err, req, res, next)` (4 args) is required for Express to recognize it as an error handler.
- Mongoose error handling is correct: `err.errors` for ValidationError, `err.code === 11000` for duplicate key (MongoDB E11000), `err.keyValue` (available since Mongoose 5.x), and `CastError` for invalid ObjectId/casting failures.
- JWT error names `JsonWebTokenError` and `TokenExpiredError` match what the `jsonwebtoken` library actually throws.
- All HTTP status codes in the reference table match RFC 9110 / IANA registry.
- Middleware ordering (routes → 404 handler → error handler) is correct — Express runs middleware in registration order.
- Winston 3.x configuration (`createLogger`, `format.combine`, `format.errors({ stack: true })`, file/console transports) uses correct current APIs.
- Process-level handlers (`unhandledRejection`, `uncaughtException`) use the correct event names, and exiting after `uncaughtException` is the Node.js-recommended approach.

## Review Notes
- Express 5 (released stable in late 2024) automatically forwards rejected promises from async route handlers to the error middleware, so the `asyncHandler` wrapper is strictly necessary only on Express 4. The post does not mention this distinction, but the wrapper still works fine on Express 5, so it is not technically incorrect — just optional there. A future revision could call this out.
- The custom `ValidationError` class shares its name with Mongoose's built-in `ValidationError`. The centralized error handler distinguishes Mongoose errors via `err.name === 'ValidationError'`, which would also match a thrown custom `ValidationError`. In practice this is harmless because both result in a 400 response, but it is worth being aware of for readers who add more specific handling.
- The `process.exit(1)` after `uncaughtException` is the documented best practice, since the process is in an undefined state. Production deployments should pair this with a process manager (PM2, systemd, Kubernetes) that restarts the process.
- The post does not pin specific versions for Express, Mongoose, Winston, or jsonwebtoken. All snippets are compatible with current LTS versions as of this review (Express 4.x/5.x, Mongoose 7.x/8.x, Winston 3.x, jsonwebtoken 9.x).
