# Validation Summary: How to Implement Custom Job IDs in BullMQ

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

## Sources Consulted
- BullMQ Job IDs documentation: https://docs.bullmq.io/guide/jobs/job-ids
- BullMQ Flows documentation: https://docs.bullmq.io/guide/flows
- BullMQ Events documentation: https://docs.bullmq.io/guide/events
- BullMQ Connections documentation: https://docs.bullmq.io/guide/connections
- BullMQ Queue API reference: https://api.docs.bullmq.io/classes/v5.Queue.html
- BullMQ Job API reference: https://api.docs.bullmq.io/classes/v5.Job.html
- BullMQ QueueEvents API reference: https://api.docs.bullmq.io/classes/v5.QueueEvents.html

## Issues Found
- The post described BullMQ's default generated job IDs as random. BullMQ documents that default job IDs are generated from an increasing queue-scoped counter, so the wording was corrected.
- The post stated that adding the same custom job ID twice returns the existing job. BullMQ documents that duplicate job IDs are ignored and not added while the existing job remains in the queue, so the idempotency explanation and example were corrected to check and return the existing job explicitly.
- Several examples used `:` inside custom `jobId` values. BullMQ documents that custom job IDs must not contain `:` because it is used as a separator, so the examples were changed to use underscores.
- The idempotency example treated completed and failed jobs as safe to recreate without removing them. BullMQ documents that removed jobs no longer count as duplicates, which means completed or failed jobs still block duplicate IDs while retained. The example now returns retained completed and failed jobs instead of reporting a new job.
- The `waitForJob` example constructed `QueueEvents` using `this.queue.opts.connection`; the example now stores the connection explicitly and passes it to `QueueEvents`.
- The flow status example referenced a `connection` variable that was not in scope and returned an array of unresolved promises from an async `map`. The example now uses the stored connection and wraps the mapped async results in `Promise.all`.
- The import examples were updated to include the BullMQ classes used by the snippets.

## Review Notes
- The batch status example uses queue-wide getters and filters in application code. This is technically valid, but for very large queues a separate registry or indexed lookup pattern would scale better.
- The registry example uses Redis `KEYS`, which works for small datasets but can block Redis on large keyspaces. Consider `SCAN` for production-scale registries.
