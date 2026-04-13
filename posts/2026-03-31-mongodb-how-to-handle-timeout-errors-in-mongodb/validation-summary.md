# Validation Summary: How to Handle Timeout Errors in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (server-side timeout behavior, error codes)
- Node.js MongoDB driver (connection options, error handling, retry patterns)
- PyMongo (Python MongoDB driver — connection options, exception classes)

## Sources Consulted
- MongoDB official documentation: Connection String URI Format (connectTimeoutMS, socketTimeoutMS, serverSelectionTimeoutMS options and defaults)
- MongoDB official documentation: cursor.maxTimeMS() and server error codes
- MongoDB Node.js Driver API documentation: MongoClient options, FindOptions, AggregateOptions
- PyMongo documentation: Collection.find() keyword arguments (max_time_ms), pymongo.errors exception classes (ExecutionTimeout, ServerSelectionTimeoutError, NetworkTimeout)
- MongoDB error code reference: code 50 (MaxTimeMSExpired), code 89 (NetworkTimeout), code 91 (ShutdownInProgress)

## Issues Found

1. **Incorrect description of socketTimeoutMS behavior (line 147)**: The post stated "Client-side timeouts (`connectTimeoutMS`, `socketTimeoutMS`) trigger before the operation reaches the server." This is incorrect for `socketTimeoutMS` — socket timeouts fire while waiting for a response on an already-established connection, meaning the operation has already been sent to the server. Fixed to clearly distinguish: `connectTimeoutMS` fires during the TCP handshake (before operations), while `socketTimeoutMS` fires while awaiting a response (after the operation reaches the server).

2. **Summary claimed "exponential backoff" but code uses linear backoff (line 176)**: The retry code uses `delayMs * (i + 1)` which produces delays of 500ms, 1000ms, 1500ms — this is linear backoff, not exponential. Exponential backoff would use `delayMs * 2^i` (500ms, 1000ms, 2000ms). Fixed the summary to say "backoff" without specifying the type, matching the actual code behavior.

## Review Notes
- Error code 91 is officially named `ShutdownInProgress` in MongoDB's error code catalog. The post describes it as "Interrupted at shutdown" which is close but not the exact name (the distinct error `InterruptedAtShutdown` is code 11600). The description is adequate for a blog post context.
- The timeout defaults in the table are accurate for the MongoDB Node.js driver 4.x+. In older driver versions (3.x), `socketTimeoutMS` defaulted to 360000ms (6 minutes) rather than 0. The post does not specify a driver version, but the values match current versions.
- The `MongoServerError` import in the Node.js error handling example is unused in the function body. This is a minor style issue, not a technical error.
