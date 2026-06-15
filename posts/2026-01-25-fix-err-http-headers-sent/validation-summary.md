# Validation Summary: How to Fix 'Error: ERR_HTTP_HEADERS_SENT'

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- Node.js HTTP server responses
- Express.js response APIs
- Express.js middleware and error handling
- JavaScript asynchronous control flow

## Sources Consulted
- Express 5.x Response API: https://expressjs.com/en/5x/api/response/
- Express Error Handling Guide: https://expressjs.com/en/guide/error-handling/
- Node.js HTTP API documentation: https://nodejs.org/api/http.html

## Issues Found
- The debug middleware wrapped both `res.json()` and `res.send()` and set `responseSent = true` before calling the original `res.json()`. In Express, `res.json()` sends the response through `res.send()`, so the example could incorrectly report a double response on the first valid `res.json()` call and prevent the response from being sent. Updated the `res.json()` wrapper to call the original method first and then mark the response as sent.

## Review Notes
- The main explanation is technically accurate: Node exposes `response.headersSent` as a read-only boolean, Express exposes `res.headersSent`, and Express recommends delegating to the default error handler with `next(err)` when headers have already been sent.
- In Express 5, rejected promises from async route handlers are automatically passed to `next()`, so an async-handler wrapper may be unnecessary in new Express 5 applications. The wrapper shown remains valid for Express 4-style applications and explicit control.
