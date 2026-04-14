# Validation Summary: How to Build Real-Time Price Feeds with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pub/Sub (Kafka-backed component)
- Dapr State Management
- Dapr Python SDK (`dapr-client`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Apache Kafka
- Python (asyncio, websockets, Flask)
- JavaScript/Node.js
- WebSockets

## Sources Consulted
- Dapr Kafka Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Python SDK source code (GitHub `dapr/python-sdk`), specifically `dapr/clients/grpc/client.py` for `publish_event` and `save_state` signatures
- Dapr JavaScript SDK source code (GitHub `dapr/js-sdk`), specifically `DaprServer.ts` constructor and `DaprPubSubServer` subscribe/publish interfaces

## Issues Found

1. **Kafka component: `authRequired` deprecated** — Replaced `authRequired: "false"` with `authType: "none"`. The `authRequired` field was deprecated in Dapr v1.6 in favor of `authType`.

2. **Kafka component: `producerFetchMinBytes` does not exist** — Removed this field entirely. "Fetch" is a consumer-side Kafka concept; there is no `producerFetchMinBytes` metadata field in the Dapr Kafka pub/sub component spec.

3. **Kafka component: `consumerFetchMinBytes` wrong field name** — Renamed to `consumerFetchMin`. The Dapr Kafka component uses `consumerFetchMin` (without the "Bytes" suffix).

4. **Kafka component: `consumerFetchMaxWait` does not exist** — Removed this field. The Dapr Kafka pub/sub component does not expose Kafka's `fetch.max.wait.ms` as a configurable metadata field.

5. **JavaScript: `serverPort` type mismatch** — Changed `new DaprServer({ serverPort: 3001 })` to `new DaprServer({ serverPort: "3001" })`. The `serverPort` option is typed as `string` in the Dapr JS SDK.

6. **JavaScript: missing `server.start()` call** — Added `await server.start()` after subscription registration in both the OHLC calculation and WebSocket distribution code blocks. The Dapr JS SDK requires `server.start()` to be called after subscriptions are registered for the server to begin listening.

## Review Notes
- The Python SDK API calls (`publish_event`, `save_state`) are all correct with proper parameter names and types.
- The `partitionKey` usage in `publish_metadata` is the correct Dapr pattern for ordered delivery per partition.
- The OHLC windowing logic has a subtle edge case: the first tick initializes `volume: 0` but then the volume of that first tick is added in the update below, so it is handled correctly.
- The Flask-based state caching endpoint at `/price-ticks` receives Dapr pub/sub CloudEvents via HTTP POST, which is the correct subscription pattern for Dapr's programmatic subscription model. However, the `request.json['data']` access assumes the CloudEvents format, which is correct as Dapr wraps pub/sub messages in CloudEvents by default.
