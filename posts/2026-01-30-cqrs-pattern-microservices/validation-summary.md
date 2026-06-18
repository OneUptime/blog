# Validation Summary: How to Implement CQRS Pattern in Microservices

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- CQRS
- Microservices
- Event-driven architecture
- Node.js
- TypeScript
- NestJS
- TypeORM
- Kafka
- MongoDB / Mongoose
- PostgreSQL
- Kubernetes
- Prometheus metrics
- Testcontainers for Node.js

## Sources Consulted
- TypeORM Select Query Builder documentation: https://typeorm.io/docs/query-builder/select-query-builder/
- NestJS task scheduling documentation: https://docs.nestjs.com/techniques/task-scheduling
- NestJS Terminus health checks documentation: https://docs.nestjs.com/recipes/terminus
- Testcontainers for Node.js Kafka module documentation: https://node.testcontainers.org/modules/kafka/
- Testcontainers for Node.js MongoDB module documentation: https://node.testcontainers.org/modules/mongodb/
- Testcontainers for Node.js PostgreSQL module documentation: https://node.testcontainers.org/modules/postgresql/
- Mongoose lean query documentation: https://mongoosejs.com/docs/tutorials/lean.html
- MongoDB updateOne documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateone/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes liveness/readiness probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The `OrderCreatedEvent` snippet referenced an `Address` type that was not defined. Added a minimal `Address` interface so the TypeScript example is self-contained.
- The command handler injected an unused `EventPublisher`, even though the example uses the outbox repository rather than direct publishing. Removed the unused import and constructor dependency.
- A repository comment described optimistic locking while the TypeORM code used `pessimistic_write`. Updated the comment to match the actual locking mode.
- The outbox worker comment said it ran every 100ms, but `CronExpression.EVERY_SECOND` runs every second. Updated the comment.
- The outbox worker used `setLock('pessimistic_write_or_fail')` while claiming `SKIP LOCKED`. TypeORM documents `setLock('pessimistic_write').setOnLocked('skip_locked')` for this behavior, so the code was corrected.
- The projection handler switched on `ShipmentDelivered` but its parameter type did not include shipment events and used `any` in the handler. Added a `ShipmentEvent` import, included it in the union, and typed the handler.
- The event `version` field was documented as an event schema version but was also used later as the read-model freshness version. Added a separate `sequence` field to events and changed projections to store `event.sequence` as the read-model `version`.
- The read model examples used `order.version` in the polling controller but did not populate or map a version in the projection/query DTO. Added `version` updates in projection handlers and included `version` in the DTO mapping.
- The polling controller typed query parameters as numbers, but NestJS query parameters arrive as strings by default. Updated the snippet to parse and validate `minVersion` and `timeout`.
- The polling loop called a query handler that throws `NotFoundException`, which would stop polling before the read model was created. Updated the loop to continue on `NotFoundException` until timeout.
- The polling example treated `minVersion=0` as absent because it used a truthiness check. Changed the comparison to check `expectedVersion === undefined` explicitly.
- A comment in the polling example said stale data would be returned with a warning header, but the code actually returns a conflict response. Updated the comment to match the code.
- The polling controller injected an unused `EventVersionService`. Removed the unused import and constructor dependency.
- The Terminus health indicator extended the deprecated `HealthIndicator` base class. Updated it to the current `HealthIndicatorService.check(...).up()/down()` pattern from the official NestJS docs.
- The Testcontainers Kafka example used `getBootstrapServers()`, which is not the documented Node.js Kafka module pattern. Replaced it with `getHost()` plus `getMappedPort(9093)`.
- The Testcontainers examples started module containers without explicit images. Updated the snippets to pass explicit Kafka, MongoDB, and PostgreSQL images, matching the current Node.js module documentation style.
- The conclusion said the post combined the outbox pattern with event sourcing, but the implementation uses event-driven projections, not event sourcing. Corrected the wording.
- The conclusion described events as the source of truth between services. Adjusted the wording to say events communicate authoritative state changes, which matches the state-plus-outbox architecture shown in the post.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. The examples are still illustrative rather than drop-in runnable because several domain types and local helper services are intentionally omitted, but the corrected snippets now align with the documented APIs and with the architecture described in the article. Production code should still make projection updates and processed-event tracking atomic where possible, usually with a transaction or idempotent projection writes.
