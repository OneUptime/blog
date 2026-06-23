# Validation Summary: How to Use Worker Threads in Node.js for CPU-Intensive Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js worker_threads
- JavaScript worker message passing
- Worker pools
- SharedArrayBuffer and Atomics
- Express
- Sharp image processing
- bcrypt password hashing

## Sources Consulted
- Node.js worker_threads API documentation: https://nodejs.org/api/worker_threads.html
- Node.js "Don't Block the Event Loop (or the Worker Pool)": https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop
- bcrypt official README: https://github.com/kelektiv/node.bcrypt.js/
- Sharp resize API documentation: https://sharp.pixelplumbing.com/api-resize/
- Sharp output API documentation: https://sharp.pixelplumbing.com/api-output/

## Issues Found
- Corrected the statement that a worker "runs synchronously" and does not have access to the main thread's event loop. Workers run JavaScript on their own thread, and CPU-bound work there does not block the main thread's event loop.
- Removed the fixed "~35ms startup time" claim for workers because startup cost is environment-dependent. The post now states the accurate general point that workers have startup and memory overhead.
- Added a missing `heavyComputation` function to the inline worker example so the snippet does not fail with a `ReferenceError`.
- Fixed the simple worker pool error path so failed workers are removed from both `workers` and `freeWorkers`, the current callback is cleared, and queued work resumes after a replacement worker is added.
- Added `app.use(express.json())` to the Express example so `req.body` is populated for JSON requests.
- Corrected the bcrypt explanation. The synchronous bcrypt APIs block the event loop; the asynchronous bcrypt APIs use a thread pool. The worker example is now framed as isolation of CPU-intensive auth work rather than the only way to avoid event-loop blocking.
- Updated the transfer-list example to use a `Uint8Array` backed by a transferable `ArrayBuffer`, avoiding ambiguity with Node.js `Buffer` instances.
- Added a duplicate-failure guard to the resilient worker pool example so an `error` event followed by a non-zero `exit` event does not create multiple replacement workers for the same failure.

## Review Notes
The examples are intentionally simplified and do not cover every production concern, such as backpressure limits, queue size limits, AsyncResource integration for worker pools, input validation for file paths, or graceful process shutdown hooks. These are reasonable future improvements but are not required for the technical correctness of the post.
