# Validation Summary: How to Build a Webhook Delivery System with BullMQ

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
- Webhooks
- HMAC-SHA256 signatures

## Sources Consulted
- BullMQ rate limiting documentation: https://docs.bullmq.io/guide/rate-limiting
- BullMQ retrying failing jobs documentation: https://docs.bullmq.io/guide/retrying-failing-jobs
- BullMQ events documentation: https://docs.bullmq.io/guide/events
- BullMQ connections documentation: https://docs.bullmq.io/guide/connections
- BullMQ auto-removal documentation: https://docs.bullmq.io/guide/queues/auto-removal-of-jobs
- BullMQ job getters documentation: https://docs.bullmq.io/guide/jobs/getters
- ioredis README: https://github.com/redis/ioredis
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Node.js AbortSignal documentation: https://nodejs.org/api/globals.html#static-method-abortsignaltimeoutdelay
- Express routing documentation: https://expressjs.com/en/guide/routing/
- Redis HSET documentation: https://redis.io/docs/latest/commands/hset/
- Redis RPUSH documentation: https://redis.io/docs/latest/commands/rpush/
- Redis EXPIRE documentation: https://redis.io/docs/latest/commands/expire/

## Issues Found
- The delivery tracking example read `subscriptionId`, `event`, `url`, `payload`, and `createdAt` from Redis but never wrote those fields. Added `createDelivery()` and an `enqueueTrackedWebhook()` example that records the pending delivery before enqueueing the BullMQ job.
- The tracked worker marked a webhook failed when `attemptsMade >= attempts - 1`, which could mark the delivery failed before the final retry was exhausted. Changed the check to `attemptsMade >= attempts`.
- The signature verification example passed raw strings to `crypto.timingSafeEqual()` without checking byte lengths. Node.js requires equal byte lengths, so malformed signatures could throw before the intended invalid-signature branch. Changed the code to parse hex buffers, check lengths, and then use `timingSafeEqual()`.
- The dead letter queue example created a new Worker whose processor always threw. BullMQ worker events are local to the worker processing the job, so that example would consume and fail jobs instead of passively listening for failures. Changed the handler to accept the actual delivery worker and attach the failed listener to it.

## Review Notes
- The BullMQ queue, worker, retry, exponential backoff, removal, rate limiter, and getter APIs used in the post match current BullMQ documentation.
- `AbortSignal.timeout()` is available in supported modern Node.js versions; projects on older Node.js releases should use an `AbortController` timeout fallback.
- The per-endpoint rate limiting example creates one queue and worker per domain. That is technically valid, but high-cardinality endpoint domains should be managed carefully in production.
