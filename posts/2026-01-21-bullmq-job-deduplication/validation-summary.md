# Validation Summary: How to Implement Job Deduplication in BullMQ

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
- Job queues
- Idempotency and deduplication patterns

## Sources Consulted
- BullMQ Job IDs documentation: https://docs.bullmq.io/guide/jobs/job-ids
- BullMQ Deduplication documentation: https://docs.bullmq.io/guide/jobs/deduplication
- BullMQ Auto-removal of jobs documentation: https://docs.bullmq.io/guide/queues/auto-removal-of-jobs
- BullMQ Connections documentation: https://docs.bullmq.io/guide/connections
- BullMQ Queue API reference: https://api.docs.bullmq.io/classes/v4.Queue.html
- BullMQ QueueEvents API reference: https://api.docs.bullmq.io/interfaces/v5.QueueEventsListener.html
- BullMQ 5.79.1 package type definitions and Lua scripts from npm
- ioredis 5.11.1 package type definitions from npm
- ioredis CommonRedisOptions API reference: https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html

## Issues Found
- The introduction implied deduplication guarantees a job is not processed multiple times and used exactly-once wording. Updated it to say deduplication prevents the same job from being enqueued multiple times, which is the behavior BullMQ custom job IDs provide.
- The post said duplicate custom job IDs are "rejected." BullMQ documents that a job with an existing custom ID is ignored and not added, with a `duplicated` event. Updated the explanation and comments to use "ignored" and "not added."
- The first example imported `Worker` without using it. Removed the unused import.
- The TTL and high-throughput examples only treated `waiting`, `active`, and `delayed` as non-final states. Updated them to include current BullMQ job states `prioritized` and `waiting-children` so duplicate jobs are not accidentally treated as finalized.
- The idempotency-key example used the raw idempotency key inside a BullMQ custom `jobId`. BullMQ custom job IDs must not contain `:`, and HTTP idempotency keys can contain arbitrary characters. Updated the example to hash the idempotency key before building the custom job ID.
- The Redis lock example released the lock with a separate `GET` and `DEL`, which is not atomic. Updated it to use a Lua compare-and-delete script so a process cannot delete a lock it no longer owns.
- The best-practices list referred to duplicates being "rejected." Updated it to "ignored" to match BullMQ terminology and behavior.

## Review Notes
- BullMQ now also provides a dedicated `deduplication` job option with Simple, Throttle, Debounce, and keep-last-if-active modes. The post focuses on custom `jobId` strategies, which remain valid, but a future revision could compare custom job IDs with BullMQ's dedicated deduplication option.
- Auto-removal of completed and failed jobs is lazy in BullMQ. The TTL example is valid because it explicitly checks and removes old completed jobs before adding a new job.
