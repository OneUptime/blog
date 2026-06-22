# Validation Summary: How to Set Up Job Priorities in BullMQ

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
- BullMQ prioritized jobs guide: https://docs.bullmq.io/guide/jobs/prioritized
- BullMQ Queue API reference: https://api.docs.bullmq.io/classes/v5.Queue.html
- BullMQ Job API reference: https://api.docs.bullmq.io/classes/v5.Job.html
- BullMQ JobsOptions API reference: https://api.docs.bullmq.io/interfaces/v1.JobsOptions.html
- ioredis README and connection examples: https://github.com/redis/ioredis

## Issues Found
- Corrected the priority range explanation. BullMQ's current guide states explicit priority values range from 1 to 2,097,152, while jobs without an assigned priority are processed before prioritized jobs.
- Updated priority statistics to include both `waiting` and `prioritized` states. Current BullMQ stores prioritized jobs in a separate `prioritized` state, so using only `getWaiting()` misses priority jobs.
- Updated the priority aging example to use `getPrioritized()` and `job.changePriority()` instead of removing and re-adding jobs. `changePriority()` is the documented API for changing priority after insertion.
- Updated monitoring to report the `prioritized` state separately and preserve priority `0` with nullish coalescing instead of treating it as falsy.
- Updated support ticket escalation to use `job.changePriority()` instead of remove-and-readd behavior.
- Added `Job` to the initial BullMQ import so the later worker processor type is available.

## Review Notes
The examples are illustrative and assume surrounding application setup such as Redis availability, worker lifecycle cleanup, and appropriate error handling. `getCompleted(0, 1000)` samples a bounded set of completed jobs rather than all historical completed jobs, which is acceptable for monitoring examples but should be tuned for production.
