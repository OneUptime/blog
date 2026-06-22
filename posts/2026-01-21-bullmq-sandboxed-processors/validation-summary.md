# Validation Summary: How to Use BullMQ Sandboxed Processors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BullMQ
- Node.js
- TypeScript
- Redis
- ioredis
- Worker threads
- Child processes

## Sources Consulted
- BullMQ Sandboxed processors guide: https://docs.bullmq.io/guide/workers/sandboxed-processors
- BullMQ Workers guide: https://docs.bullmq.io/guide/workers
- BullMQ timeout pattern for sandboxed processors: https://docs.bullmq.io/patterns/timeout-for-sandboxed-processors
- BullMQ WorkerOptions API reference: https://api.docs.bullmq.io/interfaces/v5.WorkerOptions.html
- BullMQ SandboxedJob API reference: https://api.docs.bullmq.io/interfaces/v5.SandboxedJob.html
- BullMQ connections guide: https://docs.bullmq.io/guide/connections
- ioredis CommonRedisOptions API reference: https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html
- Node.js child_process documentation: https://nodejs.org/api/child_process.html
- Node.js worker_threads documentation: https://nodejs.org/api/worker_threads.html

## Issues Found
- The post described sandboxed processors as a way to run untrusted code. BullMQ's sandboxed processors isolate processor execution from the main worker process, but child processes or worker threads are not a complete security sandbox. I changed the wording to describe this as limited isolation and removed the unsafe-code recommendation.
- Several examples imported unused BullMQ types such as `Job` and `Queue`. I removed the unused imports so the snippets are cleaner and avoid TypeScript lint failures.
- The crash-handling example used `stalledInterval` and `maxStalledCount` under `settings`. In current BullMQ WorkerOptions, these are top-level worker options. I moved them to the correct level.
- The crash-handling and multi-queue examples referenced `connection` without defining it. I added the Redis connection setup with `maxRetriesPerRequest: null`, matching BullMQ's guidance for worker ioredis connections.
- The dependency cleanup example used an asynchronous Redis `quit()` call in a process `exit` handler, where async work is not awaited. I changed it to handle `SIGTERM` and await `quit()` before exiting.
- The timeout example used `Promise.race`, which rejects the job but does not kill a stuck sandboxed processor and does not match BullMQ's documented TTL pattern. I replaced it with a timer-based process exit pattern and added a note that timers require the processor event loop to be able to run.

## Review Notes
The remaining examples are illustrative and omit application-specific details such as queue producers, test runner setup, and production signal handling for `SIGINT`. The post does not pin a BullMQ version; the review was performed against the current BullMQ v5 documentation available on 2026-06-22.
