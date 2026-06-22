# Validation Summary: How to Debug Failed Jobs in BullMQ

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- BullMQ
- Node.js
- TypeScript
- Redis
- ioredis
- Express

## Sources Consulted
- BullMQ Workers guide: https://docs.bullmq.io/guide/workers
- BullMQ Connections guide: https://docs.bullmq.io/guide/connections
- BullMQ Retrying jobs guide: https://docs.bullmq.io/guide/jobs/retrying-job
- BullMQ Queue API reference: https://api.docs.bullmq.io/classes/v3.Queue.html
- BullMQ Job API reference: https://api.docs.bullmq.io/classes/v4.Job.html
- BullMQ Worker API reference: https://api.docs.bullmq.io/classes/v4.Worker.html
- BullMQ JobsOptions API reference: https://api.docs.bullmq.io/interfaces/v1.JobsOptions.html

## Issues Found
- The Job Data Inspector used `job.log('')` to retrieve logs. In BullMQ, `job.log(logRow)` appends a log row and returns the total log count. I changed this to `queue.getJobLogs(jobId)` and returned `logs.logs`, which matches the Queue API.
- The debug worker replaced `console.log` when `traceExecution` was enabled but never restored it. I added a `finally` block to restore the original logger after the job finishes or fails.

## Review Notes
The reviewed BullMQ APIs are current for the v5 API reference. The examples are illustrative and still assume the surrounding application provides functions such as `processJob` and production-grade persistence for captured errors.
