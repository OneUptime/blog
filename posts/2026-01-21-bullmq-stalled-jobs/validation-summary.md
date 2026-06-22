# Validation Summary: How to Handle Stalled Jobs in BullMQ

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
- BullMQ Stalled Jobs guide: https://docs.bullmq.io/guide/jobs/stalled
- BullMQ WorkerOptions API: https://api.docs.bullmq.io/interfaces/v5.WorkerOptions.html
- BullMQ Job API: https://api.docs.bullmq.io/classes/v4.Job.html
- BullMQ Queue API: https://api.docs.bullmq.io/classes/v4.Queue.html
- BullMQ QueueEventsListener API: https://api.docs.bullmq.io/interfaces/v5.QueueEventsListener.html
- BullMQ Connections guide: https://docs.bullmq.io/guide/connections

## Issues Found
- The post implied that long async jobs stall simply because they run longer than `lockDuration`. Updated the examples and guidance to explain that BullMQ workers automatically renew locks by default, and stalls occur when renewal cannot happen, such as worker crashes or event-loop blocking.
- The stall configuration helper said the lock should be longer than the expected job duration. Updated it to focus on expected event-loop blocking time and renewal margin, which matches BullMQ's lock renewal model.
- The lock extension sections implied manual `job.extendLock()` is generally required for long-running Worker jobs. Updated the text and examples to frame manual extension as relevant when automatic renewal is disabled or when jobs are manually processed.
- The recovery manager attempted to call `job.moveToFailed()` from a stalled-event handler using an empty or stale token. Removed those unsafe calls and directed failure behavior to BullMQ's `maxStalledCount` setting instead.
- The debugging code hard-coded Redis lock keys with the default `bull` prefix. Updated it to use `queue.toKey(...)` so it works with custom BullMQ prefixes.
- The debugging code used Redis `ttl()` and converted seconds to milliseconds. Updated it to use `pttl()` and expose millisecond TTL values directly.
- The potential-stall debugger treated active runtime longer than `lockDuration` as suspicious. Updated it to flag active jobs whose lock is already expired, since elapsed active time alone is not a stall signal when automatic renewal is working.
- The debug output referenced `job.opts.lockDuration`, but `lockDuration` is a worker option, not a job option. Removed that field.

## Review Notes
The examples remain illustrative and depend on surrounding application functions such as `processOrder`, `sendAlert`, and Express `app` being defined elsewhere. The post now aligns with current BullMQ v5 documentation for Worker lock renewal, stalled job recovery, QueueEvents payloads, Job token/extendLock APIs, and queue key construction.
