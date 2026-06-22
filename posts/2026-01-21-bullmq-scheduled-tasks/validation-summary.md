# Validation Summary: How to Build a Scheduled Task System with BullMQ

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
- Express
- Cron-style scheduling

## Sources Consulted
- BullMQ Job Schedulers documentation: https://docs.bullmq.io/guide/job-schedulers
- BullMQ Repeat Options documentation: https://docs.bullmq.io/guide/job-schedulers/repeat-options
- BullMQ Connections documentation: https://docs.bullmq.io/guide/connections
- BullMQ Queue API reference: https://api.docs.bullmq.io/classes/v5.Queue.html
- BullMQ Repeatable Jobs documentation: https://docs.bullmq.io/guide/jobs/repeatable
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- ioredis scanStream documentation: https://github.com/redis/ioredis

## Issues Found
- Recurring jobs created by `upsertJobScheduler` use BullMQ-managed job IDs, so checking active jobs by `j.id === task_${taskId}` would not reliably detect running scheduler-produced jobs. Changed the status check to match `j.data.taskId`.
- Task definitions were stored under `task:${id}`, while execution history and current execution markers used `task:${taskId}:executions` and `task:${taskId}:current`. The `loadTasks()` pattern `task:*` could pick up non-definition keys and fail to parse them as task definitions. Changed persisted task definitions to `task:definition:${id}` and updated loading/deletion accordingly.
- `loadTasks()` used Redis `KEYS`, which Redis documents as unsuitable for regular application code on large databases. Replaced it with ioredis `scanStream()` using a `MATCH` pattern.
- The task group snippet used BullMQ's `Job` type without importing it. Added the required BullMQ import and the `ioredis` import used by that snippet.
- The conclusion referred to BullMQ's "repeatable jobs feature" even though the post uses the current Job Schedulers API and BullMQ documents older repeatable APIs as deprecated in favor of Job Schedulers. Updated the wording.
- The best-practices item about unique job IDs did not distinguish one-time jobs from scheduler-produced recurring jobs, whose IDs are managed by BullMQ. Clarified the guidance.

## Review Notes
The examples are illustrative and still omit production concerns such as request validation, durable task-definition storage outside Redis TTLs, authorization for task-management endpoints, and a real cron-parser implementation for `getNextRunTime()`. These are noted as implementation details rather than technical inaccuracies in the post.
