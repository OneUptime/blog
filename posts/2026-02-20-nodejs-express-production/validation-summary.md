# Validation Summary: How to Build a Production-Ready Node.js Express API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- Helmet
- CORS middleware
- Compression middleware
- Morgan
- Joi
- express-rate-limit
- Winston / logform
- Node.js process signal and error events

## Sources Consulted
- Express error handling guide: https://expressjs.com/en/guide/error-handling/
- Express 5 API reference: https://expressjs.com/en/api/
- Express CORS middleware documentation: https://expressjs.com/en/resources/middleware/cors/
- Express Compression middleware documentation: https://expressjs.com/en/resources/middleware/compression/
- Express Morgan middleware documentation: https://expressjs.com/en/resources/middleware/morgan/
- Helmet documentation: https://helmetjs.github.io/
- express-rate-limit configuration documentation: https://express-rate-limit.mintlify.app/reference/configuration
- Winston logform documentation: https://github.com/winstonjs/logform
- Fecha date format token documentation: https://github.com/taylorhakes/fecha
- Node.js process documentation: https://nodejs.org/api/process.html
- Joi API documentation: https://joi.dev/api/

## Issues Found
- The `users.js` route example called `userService.findAll()`, `userService.create()`, and `userService.findById()` without importing or defining `userService`. Added `const userService = require('../services/userService');` so the route module references an explicit service dependency.
- The custom Express error handler ignored `next` and attempted to write a JSON response even if response headers had already been sent. Updated it to accept `next` and delegate with `return next(err);` when `res.headersSent` is true, matching Express guidance for custom error handlers.
- The Winston timestamp format used `sss` for fractional seconds. logform delegates string formats to Fecha, whose millisecond token is `SSS`. Updated the format to `YYYY-MM-DDTHH:mm:ss.SSSZ`.

## Review Notes
The async route wrapper remains technically valid and useful for Express 4 compatibility. Express 5 can forward rejected promises from route handlers automatically, so a future version-specific refresh could mention that the wrapper is optional on Express 5.
