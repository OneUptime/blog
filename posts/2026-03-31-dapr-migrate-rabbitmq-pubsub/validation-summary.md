# Validation Summary: How to Migrate from RabbitMQ Direct Usage to Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr Pub/Sub (pubsub.rabbitmq component)
- RabbitMQ
- Node.js amqplib
- Express.js
- Axios
- CloudEvents
- Dapr CLI

## Sources Consulted
- Dapr RabbitMQ Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr publishing raw payloads (without CloudEvents): https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-raw/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- amqplib (Node.js AMQP client) API: https://amqp-node.github.io/amqplib/
- Existing blog post in repo: posts/2026-02-02-rabbitmq-nodejs/README.md (cross-referenced amqplib API usage)

## Issues Found

1. **Deprecated `host` metadata field in component YAML**: The Dapr RabbitMQ pub/sub component renamed the `host` metadata field to `connectionString`. Changed `host` to `connectionString` in the component YAML.

2. **Incorrect `concurrency` metadata field name**: The correct metadata field name for the Dapr RabbitMQ pub/sub component is `concurrencyMode`, not `concurrency`. Updated the field name.

3. **Subscriber reads `req.body` instead of `req.body.data`**: Dapr wraps pub/sub messages in a CloudEvents envelope by default. The actual published payload is at `req.body.data`, not `req.body`. Changed `const order = req.body;` to `const order = req.body.data;` in the subscriber handler.

4. **Subscriber port mismatch**: The subscriber Express app listened on port 3000 (`app.listen(3000, ...)`), but the `dapr run` command specified `--app-port 3001`. Dapr would try to deliver messages to port 3001 where nothing was listening. Changed the app to listen on port 3001 to match the CLI flag.

5. **Deprecated `--components-path` CLI flag**: The `--components-path` flag is deprecated in favor of `--resources-path`. Updated both `dapr run` commands to use `--resources-path`.

## Review Notes
- The amqplib "Before" code examples are all correct and demonstrate proper AMQP patterns (exchange assertion, queue binding, manual ack).
- The rawPayload query parameter (`?metadata.rawPayload=true`) is correctly documented.
- The post's summary claim that switching brokers only requires changing the component file is accurate for Dapr's pub/sub abstraction.
- The post could benefit from a note that when using `rawPayload=true` on the publisher side, the subscriber would receive the raw data directly in `req.body` rather than needing `req.body.data`, but this is an enhancement rather than an error.
