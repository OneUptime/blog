# Validation Summary: How to Implement Custom Error Handlers in Express

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Node.js
- Express 4.x and Express 5.x
- Express error-handling middleware
- HTTP status codes and headers
- Mongoose error normalization
- Sequelize error normalization
- JSON Web Token error handling
- Winston logging
- Supertest API testing

## Sources Consulted
- Express Error Handling guide: https://expressjs.com/en/guide/error-handling/
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5/
- Express 5 release announcement: https://expressjs.com/en/blog/2024-10-15-v5-release/
- Express 5.x API Reference: https://expressjs.com/en/api/
- Node.js Process API documentation: https://nodejs.org/api/process.html
- MDN Retry-After header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After
- MDN 429 Too Many Requests reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
- MDN 422 Unprocessable Content reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/422
- Mongoose validation documentation: https://mongoosejs.com/docs/validation.html
- Sequelize validations and constraints documentation: https://sequelize.org/docs/v6/core-concepts/validations-and-constraints/
- Sequelize UniqueConstraintError API reference: https://sequelize.org/api/v7/classes/_sequelize_core.index.uniqueconstrainterror
- jsonwebtoken package documentation: https://github.com/auth0/node-jsonwebtoken

## Issues Found
- Express 5 was described as "currently in beta." Express 5 has been published since October 15, 2024, so the post now simply refers to Express 5.x and keeps the async error-handling behavior.
- The default Express error handler was described as leaking stack traces in production. Official Express documentation says stack traces are not included in production, so the post now distinguishes development stack traces from the default production HTML error response.
- The general async middleware rule implied all Express versions require manual async error forwarding. The wording now specifies Express 4, matching the later Express 5 section.
- Custom error handler examples did not delegate to the default Express handler when response headers had already been sent. The examples now include `res.headersSent` checks and `next(err)`, as recommended by Express.
- Third-party error normalization returned generic `AppError` instances for duplicate-key and JWT errors even though the post had already introduced `ConflictError` and `UnauthorizedError`. The examples now use those custom error classes so response codes remain consistent.
- Mongoose `CastError` for invalid ObjectId input was converted to `NotFoundError`. The example now treats invalid input as a `ValidationError`, aligning with the post's HTTP status guidance for invalid request parameters.

## Review Notes
The examples are illustrative and reference placeholder application functions such as `findUserById`, `authenticateUser`, and `generateToken`; that is acceptable for a tutorial but they would need real implementations in a runnable sample app. The test examples also assume routes like `/users` and `/trigger-error` exist in the app under test.
