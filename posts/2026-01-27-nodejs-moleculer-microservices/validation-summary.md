# Validation Summary: How to Build Microservices with Node.js and Moleculer

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- Moleculer
- moleculer-web
- moleculer-db
- NATS, Redis, MQTT, and TCP transporters
- Docker and Docker Compose
- Kubernetes
- Jest and Supertest

## Sources Consulted
- Moleculer configuration docs: https://moleculer.services/docs/0.14/configuration.html
- Moleculer 0.15 networking and serializers docs: https://moleculer.services/docs/0.15/networking.html
- Moleculer events docs: https://moleculer.services/docs/0.14/events.html
- Moleculer context docs: https://moleculer.services/docs/0.15/context.html
- Moleculer fault-tolerance docs: https://moleculer.services/docs/0.15/fault-tolerance.html
- Moleculer caching docs: https://moleculer.services/docs/0.15/caching.html
- moleculer-web API Gateway docs: https://moleculer.services/docs/0.14/moleculer-web.html
- moleculer-db docs: https://moleculer.services/docs/0.15/moleculer-db.html
- Moleculer npm metadata and package source for 0.15.0
- moleculer-db npm metadata and package source for 0.9.0

## Issues Found
- The feature list claimed Moleculer provides multi-level caching, Avro/Protocol Buffers serializers, and API Gateway support for REST, GraphQL, or WebSocket. Updated these to match current Moleculer docs: action caching with Memory/MemoryLRU/Redis/custom cachers, JSON/JSONExt/MessagePack/Notepack/CBOR/custom serializers, and RESTful APIs via `moleculer-web`.
- The install commands omitted dependencies used in examples. Added `bcrypt`, `jest`, and `supertest`, and clarified `moleculer-repl` as a companion development module rather than the CLI.
- The broker entry point ignored the `SERVICES` environment variable used later in Docker examples. Updated it to load comma-separated service files from `SERVICES`.
- The users service used `this.adapter` and `MoleculerClientError` without configuring `moleculer-db` or importing Moleculer errors. Added the DB mixin, collection, fields, and required imports.
- The orders service instantiated `new DbMixin.MemoryAdapter()`, which is unnecessary and misleading because `moleculer-db` provides the default memory adapter when no adapter is configured. Removed the explicit adapter and added missing error imports.
- Several examples used `user.id`, while the default `moleculer-db` ID field is `_id`. Updated code and tests to use `_id`.
- The `ctx.call` retry example used `retryDelay`, which is not a documented call option. Removed it and kept the supported `retries` override.
- The local-event example used an unsupported `ctx.emit(..., { broadcast: false })` pattern. Replaced it with `ctx.broker.broadcastLocal(...)`.
- The API Gateway route mapped to `orders.confirm`, but the post defines `orders.updateStatus`. Updated the route to `PUT /orders/:id/status`.
- The API Gateway response hook used `ctx.meta.requestID`; changed it to the documented `ctx.requestID`.
- The file upload API snippet referenced `ApiGateway` without importing it. Added the import.
- The action-cache example used action-level `keygen`, but Moleculer documents custom key generators on cacher options. Replaced it with documented action-level cache `keys`.
- Docker and Kubernetes health checks pointed at `/health` and `/ready`, but the API Gateway did not expose those aliases. Added health aliases and updated deployment examples to load the health service with the API service.
- The health service used `registry.getEndpointList`, which is not a Moleculer registry method. Updated it to use `registry.getActionEndpoints`.
- The Dockerfile used `npm ci --only=production`; updated it to the current `npm ci --omit=dev`.
- The TCP transporter section implied TCP is Moleculer's default transporter. Updated wording because Moleculer's default transporter is `null`; the tutorial config defaults to TCP explicitly.

## Review Notes
Moleculer 0.15.0 is the latest npm release checked during validation, while some official docs still mark 0.15 as beta and 0.14 as the latest stable documentation. The article now avoids claims that conflict with the current 0.15 package and documentation. Complete JavaScript code fences were parsed with Node's `vm.Script`; intentionally partial snippets with top-level `await` or multiple `module.exports` examples were excluded from that mechanical syntax pass.
