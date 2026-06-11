# Validation Summary: How to Create Worker Thread Pools in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- worker_threads
- SharedArrayBuffer and Atomics
- cluster
- Poolifier

## Sources Consulted
- Node.js worker_threads documentation: https://nodejs.org/api/worker_threads.html
- Node.js cluster documentation: https://nodejs.org/api/cluster.html
- Node.js os documentation: https://nodejs.org/api/os.html
- Poolifier README and usage documentation: https://github.com/poolifier/poolifier
- Poolifier IPool API documentation: https://jsr.io/@poolifier/poolifier/doc/~/IPool

## Issues Found
- The first worker_threads example called `heavyComputation()` without defining it. Added a small function so the example is complete and can run as shown.
- The custom pool used `os.cpus().length` as the default pool size and repeated that guidance in Best Practices. Node.js documentation says `os.cpus().length` should not be used to calculate available parallelism; changed both places to `os.availableParallelism()`.
- The custom pool returned a worker to `freeWorkers` after an `'error'` event. Node.js terminates a worker after an uncaught worker exception, so reusing that worker is incorrect. Updated the error handler to reject the current task, remove the failed worker from the pool, create a replacement worker, and continue processing the queue.
- The Poolifier snippet used top-level `await` together with CommonJS `require()`, which is invalid in a regular CommonJS file. Wrapped the call in an async `main()` function.

## Review Notes
The Poolifier section is broadly accurate for current Poolifier releases, but production code should also show the corresponding Poolifier worker file using `ThreadWorker`. The custom pool remains intentionally basic and does not cover every production lifecycle case, such as explicit handling for unexpected non-error exits.
