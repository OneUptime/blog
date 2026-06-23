# Validation Summary: How to Implement Health Checks and Readiness Probes in Node.js for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- Kubernetes Deployments and probes
- PostgreSQL with node-postgres
- Redis with ioredis
- Prometheus metrics with prom-client

## Sources Consulted
- Kubernetes probes concept documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes probe configuration task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Node.js globals documentation for `AbortSignal.timeout`: https://nodejs.org/api/globals.html#static-method-abortsignaltimeoutdelay
- Node.js process documentation for `process.memoryUsage()` and `process.uptime()`: https://nodejs.org/api/process.html
- Node.js filesystem documentation for `fsPromises.statfs()` and `fs.StatFs`: https://nodejs.org/api/fs.html#fspromisesstatfspath-options
- Express 5 API documentation: https://expressjs.com/en/api/
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool
- Redis PING command documentation: https://redis.io/docs/latest/commands/ping/
- prom-client documentation: https://github.com/siimon/prom-client
- Stripe API and health alerts documentation: https://docs.stripe.com/api and https://docs.stripe.com/health-alerts

## Issues Found
- The Kubernetes Deployment manifest omitted `spec.selector` and `spec.template.metadata.labels`, which are required for a valid `apps/v1` Deployment. Added matching `app: nodejs-app` labels and selector.
- The startup probe tables described failures as only waiting. Kubernetes delays liveness/readiness while the startup probe is failing, but kills and restarts the container after the configured failure threshold. Updated both tables to state that behavior.
- The external API health check used `https://api.stripe.com/v1/health`, which is not a documented Stripe API endpoint, and it returned a healthy result for any HTTP status. Replaced it with a configurable `PAYMENT_API_HEALTH_URL` and made non-2xx responses throw.
- The disk-space check used `statfs.bfree`, which includes all free filesystem blocks. Changed it to `statfs.bavail`, which Node.js documents as the free blocks available to unprivileged users and is a better proxy for application-available space.
- Removed an unused `os` import from the disk-space example.

## Review Notes
The examples are intentionally illustrative and still depend on application-specific pieces such as `connectToDatabase()`, `warmUpCache()`, and a real payment API health endpoint. `fsPromises.statfs()` requires Node.js v18.15.0 or newer, and `AbortSignal.timeout()` requires Node.js v16.14.0 or newer; both are current, non-deprecated APIs.
