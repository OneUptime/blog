# Validation Summary: How to Use NATS with Node.js

## Status
validated

## Post Type
Tutorial / Guide — walks through NATS messaging patterns in Node.js using the official `nats` client library, covering pub-sub, request-reply, queue groups, JetStream, error handling, health checks, and graceful shutdown.

## Technologies Covered
- NATS server (core NATS + JetStream)
- `nats` npm package (Node.js client, v2.x style with `StringCodec`)
- Docker (for running NATS locally)
- Express.js (for health-check HTTP endpoints)
- Prometheus exposition format (for the metrics endpoint)
- Kubernetes liveness/readiness probes

## Sources Consulted
- nats.js client repository and source: https://github.com/nats-io/nats.js
- JetStream README in nats.js: https://github.com/nats-io/nats.js/blob/main/jetstream/README.md
- API reference (JsMsg, Consumers, Stats, etc.): https://nats-io.github.io/nats.js/
- nats.js v3 migration notes: https://github.com/nats-io/nats.js/blob/main/migration.md
- NATS server docs for CLI flags (`--jetstream`, `--http_port`) and monitoring endpoints (`/varz`)
- JetStream `StreamConfig` / `ConsumerConfig` type definitions in `jsapi_types.ts`

## Issues Found

1. **Broken JetStream consumer existence check** — The original code did:
   ```js
   const consumer = await js.consumers.get('ORDERS', 'order-processor');
   if (!consumer) { /* create */ }
   ```
   `js.consumers.get()` **throws** when the consumer does not exist; it never returns null/undefined. The guard would never fire, and the call would crash before reaching the creation path. Fixed by wrapping the lookup in `try/catch`, creating the consumer in the `catch` branch, and re-fetching it afterward so the rest of the code receives a bound Consumer instance.

2. **Non-existent `stats.reconnects` field** — The Prometheus metrics endpoint emitted:
   ```
   nats_client_reconnects ${stats.reconnects}
   ```
   The `nc.stats()` return type (`Stats`) only exposes `inBytes`, `outBytes`, `inMsgs`, `outMsgs` — there is no `reconnects` field, so the metric would render as `undefined` and break Prometheus scraping. Removed the metric block; the remaining four counters all reference valid `Stats` fields.

## Review Notes
- The post targets the v2.x style of the `nats` package (single import, `StringCodec`). In nats.js v3 the package was split into `@nats-io/transport-node`, `@nats-io/jetstream`, etc., and `StringCodec`/`JSONCodec` were removed in favour of `msg.string()` / `msg.json()` and publishing raw strings. The code as written still works against the v2.x `nats` package, which remains current; no change was needed, but readers migrating to v3 will need to adapt imports and replace the codec calls.
- `nc.status()` event types used in the post (`'disconnect'`, `'reconnect'`, `'error'`, `'ldm'`) are valid; the underlying enum also has `reconnecting`, `update`, `ping`, `staleConnection`, and `forceReconnect`, but the post's subset is a reasonable, accurate selection.
- `msg.info.redeliveryCount`, `msg.nak(ms)`, `msg.term()`, `msg.ack()`, `AckPolicy.Explicit`, `DeliverPolicy.All`, the snake_case `StreamConfig` fields (`max_msgs`, `max_bytes`, `max_age`, `duplicate_window`, `num_replicas`), and the JetStream publish options (`msgID`, `expect: { streamName }`) are all confirmed against the official type definitions.
- The `Events` import in `resilient-client.js` is unused (the code uses literal strings instead). Not a correctness issue, just a minor lint nit; left as-is.
- Docker command (`nats:latest --jetstream --http_port 8222`) and the `/varz` monitoring endpoint are correct.
