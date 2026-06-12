# Validation Summary: How to Build Composable Middleware in Express

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- TypeScript
- Express
- Express middleware
- Express error handling
- Jest-style middleware tests

## Sources Consulted
- Express guide: Using middleware - https://expressjs.com/en/guide/using-middleware/
- Express guide: Writing middleware - https://expressjs.com/en/guide/writing-middleware/
- Express guide: Error handling - https://expressjs.com/en/guide/error-handling/
- Express 5.x API reference - https://expressjs.com/en/5x/api/
- Node.js crypto documentation - https://nodejs.org/api/crypto.html#cryptorandomuuidoptions

## Issues Found
- The composition and pipeline builder examples called `RequestHandler` functions directly but did not handle returned rejected promises. Updated those calls to forward promise rejections to `next`, matching Express error-handling guidance for async middleware.
- The shared-state example used `crypto.randomUUID()` without importing `crypto`. Updated it to import `randomUUID` from `node:crypto` and call `randomUUID()`.
- The `loadPermissionsMiddleware` async example could reject without calling `next(error)` in Express 4-style usage and in custom wrapper contexts. Added a `try/catch` that forwards errors to `next`.
- The error middleware example returned a `RequestHandler` from `asyncHandler` but did not import `RequestHandler`. Added the missing import.
- The custom error handler did not delegate to Express's default error handler when `res.headersSent` was already true. Added the documented `headersSent` check and `next(err)` delegation.
- The pipeline builder example used `express.json()` and `express.text()` without importing the default `express` value. Added the missing import.
- The test example used `RequestHandler` without importing it. Added the missing import.

## Review Notes
The rate limiter is suitable as a teaching example, but production rate limiting should use a bounded or external store to avoid unbounded in-memory growth and to work across multiple Node.js processes. Express 5 can automatically forward rejected promises from route handlers and middleware that Express itself invokes, but custom composition helpers still need to handle returned promises when they invoke handlers directly.
