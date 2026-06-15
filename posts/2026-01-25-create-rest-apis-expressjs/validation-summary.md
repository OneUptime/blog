# Validation Summary: How to Create REST APIs with Express.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- npm
- Express.js
- Express Router and middleware
- express-validator
- express-rate-limit
- Mongoose-style query examples
- REST API design
- JSON error handling

## Sources Consulted
- Express 5 API Reference: https://expressjs.com/en/api/
- Express Error Handling Guide: https://expressjs.com/en/guide/error-handling/
- express-validator Validation Result API: https://express-validator.github.io/docs/api/validation-result/
- express-validator Validation Chain API: https://express-validator.github.io/docs/api/validation-chain/
- express-rate-limit documentation: https://express-rate-limit.mintlify.app/overview
- Mongoose Query API: https://mongoosejs.com/docs/api/query.html
- npm CLI help for `npm init` and `npm install`

## Issues Found
- The async error handling section implied async route handlers always need a wrapper. With the current `express` package resolving to Express 5, rejected promises from async route handlers are forwarded to error middleware automatically. Updated the text to state this and frame the wrapper as useful for Express 4 compatibility.
- The pagination example used `Math.max(1, parseInt(page))` and `Math.max(1, parseInt(limit))`, which can produce `NaN` for invalid query values. Updated the code to parse with radix 10 and fall back to default page and limit values when parsing fails.
- The API versioning example used `express.Router()` in separate route files without importing `express` in those files. Added the missing `const express = require('express');` lines so the snippets work as shown.
- Several examples combined separate files in one JavaScript code fence, creating duplicate `const` declarations if read as a single snippet. Split those examples into separate code fences at file boundaries.

## Review Notes
- The article uses CommonJS examples, which remain valid in Express applications. Projects using `"type": "module"` would need equivalent ESM imports.
- The Mongoose examples are illustrative; a complete application would need to define and import the `User` model and connect to MongoDB before using those routes.
