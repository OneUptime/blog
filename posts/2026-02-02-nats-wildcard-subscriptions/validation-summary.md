# Validation Summary: How to Implement Wildcard Subscriptions in NATS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS messaging server
- NATS JetStream (persistence layer)
- nats.js (Node.js client library, `nats` npm package)
- Docker (for running the NATS server locally)
- Node.js (JavaScript runtime, CommonJS modules)

## Sources Consulted
- nats.js JetStream README: https://github.com/nats-io/nats.js/blob/main/jetstream/README.md
- nats.js v3 migration guide: https://github.com/nats-io/nats.js/blob/main/migration.md
- nats.js JSAPI types (AckPolicy / DeliverPolicy enums): https://github.com/nats-io/nats.js/blob/main/jetstream/src/jsapi_types.ts
- NATS by Example (pull consumer): https://natsbyexample.com/examples/jetstream/pull-consumer/deno
- NATS Concepts — Subject-based Messaging / Wildcards: https://docs.nats.io/nats-concepts/subjects
- NATS Concepts — JetStream Consumers: https://docs.nats.io/nats-concepts/jetstream/consumers
- NATS Docker image documentation: https://hub.docker.com/_/nats
- npm `nats` package: https://www.npmjs.com/package/nats

## Issues Found

**JetStream consumer access / consume API (fixed).** The original JetStream example used two patterns that do not exist on the nats.js JetStream client:

1. `const consumer = await js.consumers.get('ORDERS', 'order-processor'); if (!consumer) { ... }` — `js.consumers.get()` rejects with a `ConsumerNotFoundError` when the consumer does not exist; it never returns a falsy value, so the `if (!consumer)` branch was unreachable.
2. `const messages = await js.consume('ORDERS', 'order-processor');` — there is no `consume` method on the JetStream client. Messages are consumed via the `Consumer` object returned by `js.consumers.get(...)`, i.e. `consumer.consume()`.

Both are broken in both nats.js v2 and v3. Rewrote the block to wrap the `get` in a `try/catch`, create the consumer via `jsm.consumers.add(...)` on miss, then `await consumer.consume()`.

## Review Notes
- Wildcard semantics (`*` matches exactly one token, `>` matches one or more trailing tokens) are correctly described and match the NATS subject-based messaging documentation.
- The Docker invocation `nats:latest -js -m 8222` is the documented syntax (`-js` enables JetStream, `-m` enables HTTP monitoring).
- `filter_subject: 'orders.created.>'` and the snake_case consumer config keys (`durable_name`, `ack_policy`, `deliver_policy`, `filter_subject`) match the NATS wire-level `ConsumerConfig`.
- `AckPolicy.Explicit` and `DeliverPolicy.All` are valid `as const` constants exported by the JetStream package.
- The `nats` npm package is currently at v2.29.3 and is marked deprecated; the active v3 line ships under scoped names (`@nats-io/transport-node`, `@nats-io/jetstream`, etc.). The post's use of `StringCodec` still works on v2.29.3 (which is what `npm install nats` installs today, with a deprecation warning) but `StringCodec`/`JSONCodec` were removed in v3 in favor of `m.string()` / `m.json()` on messages. A future revision should consider migrating the examples to the `@nats-io/*` v3 packages.
- Subscription patterns shown in the `wildcard-tests.js` example assume publish-before-subscribe ordering will not race; the 100 ms `setTimeout` after `flush()` is a reasonable but timing-sensitive shortcut for a tutorial.
