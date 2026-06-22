# Validation Summary: How to Implement Delayed Jobs with BullMQ

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
- date-fns-tz

## Sources Consulted
- BullMQ delayed jobs guide: https://docs.bullmq.io/guide/jobs/delayed
- BullMQ connections guide: https://docs.bullmq.io/guide/connections
- BullMQ API package typings for `Queue.getDelayed()`, `Job.changeDelay()`, `Job.remove()`, and delayed-set scoring: https://www.npmjs.com/package/bullmq
- ioredis package typings for the `Redis` export: https://www.npmjs.com/package/ioredis
- date-fns-tz README and package exports for `fromZonedTime` and `toZonedTime`: https://www.npmjs.com/package/date-fns-tz

## Issues Found
- The timezone example used older date-fns-tz function names, `zonedTimeToUtc` and `utcToZonedTime`, which are not exported by current date-fns-tz 3.2.0. Updated the imports and calls to `fromZonedTime` and `toZonedTime`.
- The delayed-job status example computed the scheduled time as `job.timestamp + job.opts.delay`. In current BullMQ, `changeDelay()` updates the delayed sorted-set score and job delay, but not the original timestamp, so that calculation can become stale after rescheduling. Updated the example to read the delayed sorted-set score through `queue.client.zscore(queue.toKey('delayed'), jobId)`.
- The trial expiration example always passed `delay: trialEnd.getTime() - now`, which could be negative for an already-expired trial. Updated it to enqueue the expiration job immediately when the expiration time has already passed.

## Review Notes
- BullMQ documents that delayed jobs are not guaranteed to run at the exact scheduled millisecond; execution depends on worker availability and other jobs scheduled at the same time.
- For producer-only `Queue` instances, BullMQ's connection guide notes that fail-fast Redis retry settings may be preferable, while `maxRetriesPerRequest: null` is important for manually supplied worker ioredis connections.
