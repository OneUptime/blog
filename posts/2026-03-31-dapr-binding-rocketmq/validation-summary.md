# Validation Summary: How to Use Dapr RocketMQ Binding for Messaging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache RocketMQ
- Dapr (Distributed Application Runtime)
- Dapr Bindings API (input and output bindings)
- Docker
- Go (application code example)
- Node.js / Express (input binding example)

## Sources Consulted
- Dapr RocketMQ Binding Component Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/rocketmq/
- Dapr Bindings API Reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr RocketMQ binding source code (components-contrib repository): settings.go and rocketmq.go for metadata field names and supported operations

## Issues Found

1. **Incorrect metadata field `groupName`** — Changed to `consumerGroup`. The Dapr RocketMQ binding uses `consumerGroup` as the metadata field name per the official docs and source code (`mapstructure:"consumerGroup"`).

2. **Incorrect metadata field `topic` (singular)** — Changed to `topics` (plural). The official docs specify `topics` as the required field, which accepts a comma-separated list of topic names.

3. **Non-existent metadata field `sendTimeOut`** — Removed entirely. The Dapr RocketMQ binding does not expose a configurable send timeout. The timeout is hardcoded to 30 seconds in the source code (`context.WithTimeout(ctx, 30*time.Second)`).

4. **Incorrect per-message metadata field names `tags` and `keys`** — Changed to `rocketmq-tag` and `rocketmq-key` respectively. The source code defines constants `metadataRocketmqTag = "rocketmq-tag"` and `metadataRocketmqKey = "rocketmq-key"` which are the actual metadata keys read from the request.

5. **Unsupported `shardingKey` metadata and ordered messaging claim** — The Dapr RocketMQ binding does not implement `shardingKey` metadata. The `sendMessage()` function only sets tag and keys on messages, with no sharding key support. Replaced the "Ordered Messaging with Message Queuing" section with a "Message Filtering with Tags and Keys" section that accurately describes supported functionality.

6. **Summary section referenced incorrect field names** — Updated to say "consumer group" instead of "producer group" and "tags and keys" instead of "tags and sharding keys" to match the corrected content.

## Review Notes
- The Docker commands for running RocketMQ locally are reasonable but use `host.docker.internal` which only works on Docker Desktop (macOS/Windows). On Linux, users would need `--network host` or explicit container networking. This is a minor portability note, not an error.
- The Go code example ignores the error from `json.Marshal`. While this is unlikely to fail for the given struct, production code should handle the error.
- The `rocketmq-topic` metadata field can be used per-request to override the topic configured in the component YAML, which the post does not mention but is not required.
- The binding also supports `accessProto` metadata to choose between `tcp`, `tcp-cgo`, and `http` protocols, which is not covered but not necessary for a basic tutorial.
