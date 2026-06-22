# Validation Summary: How to Run BullMQ Workers in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BullMQ
- Docker and Dockerfile
- Docker Compose
- Node.js
- TypeScript
- Redis and ioredis
- Prometheus metrics with prom-client
- Express
- Grafana

## Sources Consulted
- BullMQ Connections: https://docs.bullmq.io/guide/connections
- BullMQ Graceful Shutdown: https://docs.bullmq.io/guide/workers/graceful-shutdown
- BullMQ Pausing Queues: https://docs.bullmq.io/guide/workers/pausing-queues
- BullMQ Rate Limiting: https://docs.bullmq.io/guide/rate-limiting
- BullMQ Worker Concurrency: https://docs.bullmq.io/guide/workers/concurrency
- BullMQ API Reference, WorkerOptions and RateLimiterOptions: https://api.docs.bullmq.io/
- Dockerfile Reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose File Reference: https://docs.docker.com/reference/compose-file/
- Docker Compose Services Reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose CLI Reference for `up --scale`: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose environment variable documentation: https://docs.docker.com/compose/how-tos/environment-variables/
- npm `ci` documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- npm `prune` documentation: https://docs.npmjs.com/cli/commands/npm-prune/
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Node.js Docker official image: https://hub.docker.com/_/node
- ioredis official README/API documentation: https://github.com/redis/ioredis and https://redis.github.io/ioredis/
- Redis ioredis guide: https://redis.io/docs/latest/develop/clients/ioredis/
- Redis Docker official image: https://hub.docker.com/_/redis
- prom-client documentation: https://github.com/siimon/prom-client
- Express API reference: https://expressjs.com/

## Issues Found
- The Dockerfile examples used `node:20-alpine`, and the specific-tag example used `node:20.10-alpine3.18`. Node.js 20 is EOL by the validation date, so the examples were updated to Node.js 24 tags.
- The basic Dockerfile installed only production dependencies before running `npm run build`. This would commonly fail for TypeScript projects because build tools are usually dev dependencies. The example now installs all dependencies, builds, then prunes dev dependencies with `npm prune --omit=dev`.
- The multi-stage Dockerfile and Docker optimization tip used `npm prune --production`. Current npm documentation prefers the omit syntax, so these were changed to `npm prune --omit=dev`.
- The Docker Compose snippets used the obsolete top-level `version: '3.8'` field. The field was removed from the Compose examples.
- The scaling command used legacy `docker-compose` syntax. It was updated to the current `docker compose` syntax.
- The base Compose example set fixed `container_name` values on worker services that are later scaled. Docker Compose cannot scale a service beyond one container when `container_name` is set, so those worker `container_name` entries were removed.

## Review Notes
The BullMQ worker connection options, `maxRetriesPerRequest: null` usage, rate limiter configuration, Worker concurrency, signal handling, Docker health check syntax, Redis service configuration, and Prometheus metric examples are consistent with the consulted documentation. The production monitoring section is a representative Compose example; a real deployment should still provide a matching `prometheus.yml` scrape configuration and production Redis security settings.
