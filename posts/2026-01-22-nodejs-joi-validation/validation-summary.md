# Validation Summary: How to Create Data Validation with Joi in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- npm
- Joi
- Express.js
- JavaScript validation middleware

## Sources Consulted
- Joi API Reference: https://joi.dev/api/
- Joi package metadata: https://www.npmjs.com/package/joi
- Express 5.x API Reference: https://expressjs.com/en/5x/api/
- Express 5.x Request Object API: https://expressjs.com/en/5x/api/request/

## Issues Found
- The Express middleware assigned validated query parameters with `req[property] = value`. In Express 5, `req.query` is a computed request property, so direct assignment does not replace the value used later by handlers. Updated the middleware to redefine `req.query` when validating query parameters while preserving direct assignment for `req.body`.
- The custom password validator used `helpers.error('any.custom', { message: ... })`, but Joi does not automatically render the `message` context field as the error message. Updated it to use `helpers.message({ custom: ... })`, which is the documented helper for simple custom messages.
- The real-world schema example used `.concat(schemas.pagination)` inside the `schemas` object initializer. That references `schemas` before initialization and throws a `ReferenceError`. Added a separate `paginationSchema` constant and used it both in `schemas.pagination` and `.concat(paginationSchema)`.

## Review Notes
The remaining Joi examples use current Joi APIs, including `validate()`, `validateAsync()`, `external()`, `extend()`, `when()`, `link()`, `fork()`, `stripUnknown`, `presence`, `string().uuid()`, and date/number/string validators. The examples are written for CommonJS; ES module projects would use `import Joi from 'joi'` instead.
