# Validation Summary: How to Create Microservices with Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Express
- Mongoose
- Axios
- http-proxy-middleware
- express-rate-limit
- JSON Web Tokens
- RabbitMQ / AMQP with amqplib
- gRPC with @grpc/grpc-js and @grpc/proto-loader
- Protocol Buffers
- Docker Compose
- MongoDB

## Sources Consulted
- Express 5.x API Reference: https://expressjs.com/en/5x/api/
- Mongoose Schemas: https://mongoosejs.com/docs/guide.html
- Mongoose Models: https://mongoosejs.com/docs/models.html
- Axios documentation: https://axios-js.com/docs/index.html
- http-proxy-middleware README: https://github.com/chimurai/http-proxy-middleware
- express-rate-limit documentation: https://express-rate-limit.mintlify.app/overview
- jsonwebtoken npm documentation: https://www.npmjs.com/package/jsonwebtoken
- amqplib Channel API: https://amqp-node.github.io/amqplib/channel_api.html
- RabbitMQ Consumer Acknowledgements and Publisher Confirms: https://www.rabbitmq.com/docs/confirms
- gRPC Node basics: https://grpc.io/docs/languages/node/basics/
- @grpc/grpc-js package documentation: https://www.npmjs.com/package/@grpc/grpc-js
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The API Gateway health check used `axios.get()` without importing `axios`. Added the missing `const axios = require('axios');`.
- The `http-proxy-middleware` example used the older `onError` option shape. Updated it to the current `on: { error: ... }` event configuration and wrote the response using `writeHead()`/`end()` as shown in the project documentation.
- The shared HTTP client example referenced undefined `generateRequestId()` and `delay()` helpers. Added implementations using Node's `crypto.randomUUID()` and `setTimeout()`.
- The HTTP client usage example used top-level `await` in a CommonJS-style snippet. Wrapped the call in an async `fetchUser()` helper.
- The RabbitMQ negative acknowledgement comment implied dead lettering always occurs. Changed the comment to "Reject without requeue" because dead lettering depends on queue dead-letter configuration.
- The event publishing and notification snippets used `./shared/message-queue`, but the earlier project layout places the shared helper at `services/shared/message-queue.js`. Updated the relative imports to `../../shared/message-queue`.
- The gRPC server snippet referenced `User` without defining it or connecting to MongoDB. Added the Mongoose import, model definition, and database connection before binding the gRPC server.
- The gRPC client snippet used `path.join()` without importing `path`. Added `const path = require('path');`.
- The gRPC order-service usage snippet rethrew an error from an async Express handler after partially handling gRPC NOT_FOUND. Changed it to send a 500 JSON response for non-404 failures.
- The Docker Compose snippet included the obsolete top-level `version: '3.8'` field. Removed it so the example follows the current Compose Specification.
- The description claimed the post covered service discovery, but the content does not include a service discovery implementation. Updated the description to mention Docker Compose instead.

## Review Notes
- The examples are intentionally minimal and omit production hardening such as request validation, authorization scopes, centralized error middleware, idempotency, publisher confirms for RabbitMQ, circuit breaker implementation, distributed tracing setup, and external rate-limit stores for multi-instance deployments.
- The `publish()` method in amqplib returns a flow-control boolean, not a delivery confirmation. For guaranteed publisher acknowledgements, a confirm channel and `waitForConfirms()` should be used.
