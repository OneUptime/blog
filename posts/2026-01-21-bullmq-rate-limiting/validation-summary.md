# Validation Summary: How to Use BullMQ Rate Limiting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BullMQ
- BullMQ Pro
- Node.js
- TypeScript
- Redis
- ioredis
- Rate limiting

## Sources Consulted
- BullMQ Rate Limiting guide: https://docs.bullmq.io/guide/rate-limiting
- BullMQ v3 changelog: https://docs.bullmq.io/changelog/changelog-v3
- BullMQ Pro Groups guide: https://docs.bullmq.io/bullmq-pro/groups
- BullMQ Pro group rate limiting guide: https://docs.bullmq.io/bullmq-pro/groups/rate-limiting
- BullMQ Events guide: https://docs.bullmq.io/guide/events
- BullMQ WorkerOptions API reference: https://api.docs.bullmq.io/interfaces/v4.WorkerOptions.html

## Issues Found
- The post described current open-source BullMQ group-based rate limiting with `groupKey` and job `group` options. BullMQ's official guide says group-key support was removed from BullMQ 3.0 onward, and current per-group rate limiting is a BullMQ Pro groups feature. I updated the group-based examples to use `QueuePro`, `WorkerPro`, and `group.limit`.
- The dynamic rate limiting example recreated workers to change `limiter.max`. BullMQ documents dynamic/manual rate limiting via `worker.rateLimit(duration)` followed by `throw Worker.RateLimitError()`. I replaced the worker-recreation example with the documented manual rate-limit pattern.
- The monitoring example listened for a `waiting` event on `Worker` and treated every waiting event as a rate-limit event. BullMQ documents `waiting` on `Queue`, while worker events include events such as `completed` and `failed`. I changed the monitor to track completed jobs on the worker and sample `queue.getRateLimitTtl()` for active rate-limit periods.
- The introduction claimed BullMQ uses a token bucket algorithm. The official docs describe configuration in terms of `max` jobs per `duration` and do not document token-bucket behavior. I removed the algorithm claim.

## Review Notes
- The examples still use placeholder application functions such as `callExternalAPI`, `processJob`, and provider-specific API calls. Those are acceptable for a tutorial but would need real implementations in a runnable sample.
- BullMQ Pro group rate limiting requires the commercial `@taskforcesh/bullmq-pro` package and appropriate licensing; the post now identifies that distinction.
