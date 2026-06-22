# Validation Summary: How to Implement Job Dependencies with BullMQ Flows

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
- BullMQ Flows and parent-child jobs

## Sources Consulted
- BullMQ Flows guide: https://docs.bullmq.io/guide/flows
- BullMQ Job API reference: https://api.docs.bullmq.io/classes/v5.Job.html
- BullMQ Fail Parent flow guide: https://docs.bullmq.io/guide/flows/fail-parent
- BullMQ Ignore Dependency flow guide: https://docs.bullmq.io/guide/flows/ignore-dependency
- BullMQ Stop Retrying Jobs pattern: https://docs.bullmq.io/patterns/stop-retrying-jobs
- BullMQ Timeout Jobs pattern: https://docs.bullmq.io/patterns/timeout-jobs
- BullMQ auto-removal of jobs guide: https://docs.bullmq.io/guide/queues/auto-removal-of-jobs
- BullMQ JobsOptions API reference: https://api.docs.bullmq.io/interfaces/v1.JobsOptions.html

## Issues Found
- The initial import omitted `Job`, `QueueEvents`, and `UnrecoverableError`, even though later examples use those BullMQ exports. Updated the import statement so the examples reference current exported APIs.
- The "Getting Parent Data in Child" example split `job.parentKey` as `queueName:jobId`. BullMQ documents `parentKey` as a fully qualified key including the prefix, so that parsing is unsafe. Updated the example to use `job.parent.id` and derive the queue name from `job.parent.queueKey`.
- The optional child failure example used `failParentOnFailure: false`. BullMQ's documented option for allowing a parent to continue when a child fails is `ignoreDependencyOnFailure: true`. Updated the code and best-practice note accordingly.
- The non-retryable error example threw a regular `Error`, which would still consume configured retry attempts. Updated it to throw `UnrecoverableError`, the documented BullMQ mechanism for bypassing retries.
- The flow status example treated `dependencies.processed` values as Job objects with `returnvalue` fields. BullMQ's `getDependencies()` returns processed dependency values directly. Updated the loop to use the returned value directly.
- The flow status example split dependency keys as `queueName:jobId`, but BullMQ dependency keys include the prefix. Updated the parsing to take the last two colon-separated parts.
- The video processing example used `opts.timeout`, which is not a current BullMQ job option. Removed that option and updated the best-practice note to say processor code should implement explicit timeouts.
- The error handling snippet used `error.message` directly in a TypeScript `catch` block. Updated it to narrow `error` before reading the message.

## Review Notes
The remaining examples are illustrative and reference placeholder application functions such as `readFile`, `isValid`, `applyTransformation`, `writeOutput`, and media-processing helpers. Those are not BullMQ API errors, but a production post could make the placeholders explicit if it wanted fully copy-pasteable samples.
