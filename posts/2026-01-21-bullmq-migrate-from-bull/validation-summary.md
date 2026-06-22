# Validation Summary: How to Migrate from Bull to BullMQ

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Bull
- BullMQ
- Node.js
- TypeScript
- Redis
- ioredis
- Vitest

## Sources Consulted
- BullMQ Connections: https://docs.bullmq.io/guide/connections
- BullMQ Queues: https://docs.bullmq.io/guide/queues
- BullMQ Workers: https://docs.bullmq.io/guide/workers
- BullMQ Events: https://docs.bullmq.io/guide/events
- BullMQ Repeatable Jobs: https://docs.bullmq.io/guide/jobs/repeatable
- BullMQ Job Schedulers: https://docs.bullmq.io/guide/job-schedulers
- BullMQ Manage Job Schedulers: https://docs.bullmq.io/guide/job-schedulers/manage-job-schedulers
- BullMQ Timeout Jobs pattern: https://docs.bullmq.io/patterns/timeout-jobs
- BullMQ JobsOptions API reference: https://api.docs.bullmq.io/interfaces/v1.JobsOptions.html
- BullMQ RepeatOptions API reference: https://api.docs.bullmq.io/interfaces/v1.RepeatOptions.html
- BullMQ WorkerOptions API reference: https://api.docs.bullmq.io/interfaces/v4.WorkerOptions.html
- Bull reference documentation: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md
- Bull guide: https://optimalbits.github.io/bull/

## Issues Found
- Several BullMQ examples used `connection: { url: redisUrl }`. BullMQ passes connection options through to ioredis, and official examples either provide Redis connection options such as `host` and `port` or pass an `IORedis` instance. Updated Redis URL examples to create an `IORedis` instance and pass it as `connection`.
- The BullMQ job options example said timeout is handled in worker options. BullMQ does not provide a built-in job timeout mechanism; official guidance is to implement timeout behavior in the worker processor. Updated the comments and migration helper accordingly.
- The BullMQ job options interface omitted numeric `backoff`, but current `JobsOptions` accepts `number | BackoffOptions`. Updated the example type.
- The BullMQ repeatable-job migration and test used legacy repeatable APIs (`repeat` on `add`, `getRepeatableJobs`) for the new BullMQ side. BullMQ v5.16.0 and later recommends Job Schedulers instead. Updated the BullMQ side to use `upsertJobScheduler` and `getJobSchedulers`.
- The delayed-job migration copied the original delay instead of the remaining delay, which could postpone already-delayed jobs by the full original delay again. Updated it to calculate the remaining delay from `job.timestamp + job.opts.delay - Date.now()`.
- The Bull repository abstraction used the job name as `jobId` instead of adding a named Bull job. Updated it to call `queue.add(name, data, options)`.
- The cleanup snippet imported `{ Redis }` from `ioredis`. Updated it to the standard default import form, `import Redis from 'ioredis'`.

## Review Notes
The guide still shows Bull repeatable-job APIs on the source side because those are needed to read and remove existing Bull repeatable jobs during migration. The BullMQ destination examples now use the current Job Scheduler API.
