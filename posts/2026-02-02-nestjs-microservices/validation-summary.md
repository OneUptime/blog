# Validation Summary: How to Implement Microservices with NestJS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS (`@nestjs/core`, `@nestjs/common`, `@nestjs/microservices`, `@nestjs/terminus`, `@nestjs/testing`)
- Node.js
- TypeScript
- RxJS (`firstValueFrom`, `timeout`, `catchError`, `retry`, `timer`)
- Transport layers: TCP, Redis (Pub/Sub), Kafka, RabbitMQ
- `ioredis`, `kafkajs`, `amqplib`, `amqp-connection-manager`
- Saga pattern (orchestration) for distributed transactions
- Docker (multi-stage builds, Alpine base image)
- Kubernetes (Deployment, Service, HorizontalPodAutoscaler `autoscaling/v2`)
- Jest (unit and e2e testing)
- Circuit breaker / retry-with-backoff resilience patterns

## Sources Consulted
- NestJS Microservices documentation — https://docs.nestjs.com/microservices/basics
- NestJS Redis transport — https://docs.nestjs.com/microservices/redis
- NestJS Terminus (health checks) — https://docs.nestjs.com/recipes/terminus
- RxJS `retry` operator (replacement for deprecated `retryWhen`) — https://rxjs.dev/api/operators/retry
- MDN `String.prototype.substr()` deprecation notice — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr
- npm CLI v11 `npm ci` (`--omit=dev` flag) — https://docs.npmjs.com/cli/v11/commands/npm-ci
- Alpine Linux `adduser` reference — https://wiki.alpinelinux.org/wiki/Setting_up_a_new_user
- Kubernetes HorizontalPodAutoscaler v2 — https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/

## Issues Found

1. **Deprecated `String.prototype.substr()`** (three locations: `users.service.ts` `generateId`, `orders.service.ts` `generateId`, `create-order.saga.ts` `generateOrderId`).
   - `substr()` is a legacy method documented only in ECMAScript Annex B and marked deprecated by MDN.
   - **Fix:** Replaced `.substr(2, 9)` with `.slice(2, 11)` (`slice` is the standard alternative; the start offset is the same, end index shifts by the requested length).

2. **Deprecated RxJS `retryWhen`** in `shared/utils/resilience.ts`.
   - `retryWhen` was deprecated in RxJS 7 in favor of `retry({ count, delay })`. NestJS 9+ ships RxJS 7+.
   - **Fix:** Rewrote `retryWithBackoff` to use the modern `retry({ count, delay })` form, removing the now-unused `retryWhen`, `mergeMap`, `finalize`, and `throwError` imports as well as the mutable closure counter (the `delay` callback receives the retry count directly).

3. **Logical bug in `OrdersService.updateStatus`**: `previousStatus: order.status` was captured *after* `order.status = status` was assigned, so `previousStatus` always equaled `newStatus`.
   - **Fix:** Captured `const previousStatus = order.status;` before mutating, and used it in the emitted event.

4. **Deprecated `npm ci --only=production`** in the production-stage Dockerfile.
   - The `--only=production` flag is deprecated; current npm uses `--omit=dev`.
   - **Fix:** Replaced with `npm ci --omit=dev`.

5. **Alpine `adduser` did not add the new user to the `nodejs` group it created.**
   - The original `addgroup ... nodejs && adduser -S nestjs -u 1001` creates the group but the user is not assigned to it.
   - **Fix:** Added `-G nodejs` to the `adduser` command so `nestjs` actually belongs to the `nodejs` group.

## Review Notes
- The `AllExceptionsFilter` is decorated with `@Catch()` (catch-all) while typed as `RpcExceptionFilter<RpcException>`. NestJS accepts this because the implementation widens the exception parameter to `any`, but a stricter typing (`@Catch(RpcException)` or `implements ExceptionFilter`) would more accurately match intent. Left as-is — it is functional, and the article's purpose is to demonstrate an exception-formatting filter, not type ergonomics.
- `Logger.error(message, stack, context)` is called with `{ data }` as the third argument in the exception filter. The signature expects a string `context`, but NestJS's built-in logger will accept it without error. Minor cosmetic point; not changed.
- `this.completedSteps.reverse()` mutates the array in place during rollback. Because `completedSteps` is reset at the top of each `execute()` call this is safe in the example, but readers reusing the saga across calls without resetting should switch to `[...this.completedSteps].reverse()`. Left as-is — the example resets it.
- The `npm install @nestjs/platform-express` line is only strictly required for the HTTP API gateway, not for pure microservice apps invoked via `NestFactory.createMicroservice`. The article does describe a hybrid system, so the inclusion is reasonable. Not changed.
- `Transport.TCP`, `Transport.REDIS`, `ClientsModule.register`, `MicroserviceOptions`, `MessagePattern`, `EventPattern`, `Payload`, `ClientProxy.send/emit`, `INestMicroservice`, `createNestMicroservice`, `MemoryHealthIndicator.checkHeap/checkRSS`, `DiskHealthIndicator.checkStorage`, and `autoscaling/v2` HPA were all verified against current official documentation and are correct.
