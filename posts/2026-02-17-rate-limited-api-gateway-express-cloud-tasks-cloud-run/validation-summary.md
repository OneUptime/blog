# Validation Summary: How to Build a Rate-Limited API Gateway with Express.js and Cloud Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Express.js
- Node.js
- Google Cloud Run
- Google Cloud Tasks
- gcloud CLI
- Redis / Memorystore
- ioredis
- API rate limiting

## Sources Consulted
- Google Cloud Tasks HTTP task sample: https://docs.cloud.google.com/tasks/docs/samples/cloud-tasks-create-http-task
- Google Cloud Tasks HTTP target tasks: https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks
- Google Cloud Tasks queue configuration: https://docs.cloud.google.com/tasks/docs/configuring-queues
- gcloud tasks queues create reference: https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/create
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Express 4.x API reference: https://expressjs.com/en/4x/api.html
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- ioredis documentation / repository: https://github.com/redis/ioredis

## Issues Found
- The queue gateway returned the Cloud Tasks task name suffix as `jobId`, but the polling endpoint looks up results by `requestId`. Because the task payload generated a separate `requestId`, clients polling `/api/jobs/:jobId` could remain pending even after processing completed. Changed the example to generate a stable UUID-based `requestId` before task creation, send it in the task body, and return the same value as `jobId`.
- The original request ID used `Date.now()`, which can collide under concurrent requests. Replaced it with Node.js `crypto.randomUUID()`, which is documented as an RFC 4122 version 4 UUID generator.

## Review Notes
- The Cloud Tasks CLI flags and Cloud Run deploy flags used in the post match current official `gcloud` references.
- Cloud Tasks HTTP task creation with a base64-encoded request body matches the official Node.js sample.
- The in-memory examples are correctly described as per-instance only on Cloud Run. For production, the post already points readers to Redis or another shared store for global limits and durable results.
- The `/internal/process` endpoint is shown without authentication because the deployment example allows unauthenticated access. In a production system, this endpoint should usually be protected with Cloud Tasks OIDC authentication and Cloud Run IAM or equivalent request verification.
