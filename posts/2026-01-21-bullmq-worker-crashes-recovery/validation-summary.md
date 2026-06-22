# Validation Summary: How to Handle Worker Crashes in BullMQ

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
- Node.js cluster
- Worker crash recovery and stalled jobs

## Sources Consulted
- BullMQ stalled jobs guide: https://docs.bullmq.io/guide/workers/stalled-jobs
- BullMQ jobs stalled guide: https://docs.bullmq.io/guide/jobs/stalled
- BullMQ WorkerOptions API reference: https://api.docs.bullmq.io/interfaces/v5.WorkerOptions.html
- BullMQ WorkerListener API reference: https://api.docs.bullmq.io/interfaces/v5.WorkerListener.html
- BullMQ Job API reference: https://api.docs.bullmq.io/classes/v5.Job.html
- BullMQ manual job processing pattern: https://docs.bullmq.io/patterns/manually-fetching-jobs
- BullMQ connections guide: https://docs.bullmq.io/guide/connections
- BullMQ production guide: https://docs.bullmq.io/guide/going-to-production
- BullMQ graceful shutdown guide: https://docs.bullmq.io/guide/workers/graceful-shutdown
- Node.js process documentation: https://nodejs.org/api/process.html
- Node.js cluster documentation: https://nodejs.org/api/cluster.html
- ioredis README and API documentation: https://github.com/redis/ioredis and https://redis.github.io/ioredis/

## Issues Found
- The long-running job example implied that standard BullMQ workers need manual lock extension. BullMQ standard workers renew locks automatically, so the example now notes that automatic renewal is the default and uses the processor token when showing explicit `job.extendLock()` usage.
- The automatic restart example attempted to recover from `uncaughtException` and `unhandledRejection` by restarting the BullMQ worker inside the same Node.js process. Node.js documents that normal operation should not resume after an uncaught exception, so the example now exits for an external supervisor to restart the process.
- The dead letter queue example tried to detect stalled-job failures inside the job processor catch block. Repeated stalls are surfaced through BullMQ failure handling after `maxStalledCount` is exceeded, so the example now moves jobs to the DLQ from the worker `failed` event when attempts are exhausted or the stalled limit error is emitted.
- Several TypeScript snippets used BullMQ and ioredis types without local imports. Added imports to the affected snippets and removed unused imports from the first example.
- The best-practices list said `lockDuration` should match total job duration. Updated this because standard workers renew locks automatically; `lockDuration` should be long enough for reliable renewal and event-loop responsiveness.

## Review Notes
The remaining BullMQ worker options, stalled event signature, failed event handling, `maxRetriesPerRequest: null` guidance for worker ioredis connections, and Node.js cluster supervision approach match current documentation. The examples still use placeholder functions such as `processLongTask`, `processChunk`, and alerting hooks, which is appropriate for illustrative blog code.
