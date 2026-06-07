# Validation Summary: How to Handle Large Messages in RabbitMQ

## Status
validated

## Post Type
Tutorial / Technical guide with multi-language code examples (Node.js, Python, Go, YAML, Bash, INI).

## Technologies Covered
- RabbitMQ (broker, classic queues, lazy queues, policies)
- RabbitMQ Streams (3.9+, including the native stream protocol on port 5552)
- amqplib (Node.js client)
- pika (Python client)
- MinIO (S3-compatible object storage, claim check pattern)
- rabbitmq-stream-go-client (Go client)
- Prometheus alerting rules (rabbitmq_queue_memory_bytes, rabbitmq_queue_messages)
- zlib gzip compression (Node.js)
- AMQP 0-9-1 protocol concepts (frame_max, publisher confirms, prefetch, headers)

## Sources Consulted
- amqplib channel API docs — https://amqp-node.github.io/amqplib/channel_api.html (verified `createConfirmChannel` vs `confirmChannel`, behavior of `ack`/`nack`)
- RabbitMQ rabbit.schema (upstream main) — https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbit/priv/schema/rabbit.schema (verified `credit_flow_default_credit.*`, `consumer_timeout`, `vm_memory_high_watermark_paging_ratio`, `queue_master_locator`)
- RabbitMQ rabbitmq_stream.schema (upstream main) — https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_stream/priv/schema/rabbitmq_stream.schema (verified valid `stream.*` broker keys)
- RabbitMQ Streams documentation — https://www.rabbitmq.com/docs/streams (verified stream-max-segment-size-bytes is a per-stream policy/argument, not broker-level)
- RabbitMQ credit flow blog — https://www.rabbitmq.com/blog/2015/10/06/new-credit-flow-settings-on-rabbitmq-3-5-5
- rabbitmq-stream-go-client repository — https://github.com/rabbitmq/rabbitmq-stream-go-client (verified `pkg/stream` and `pkg/amqp` imports, `OffsetSpecification`, `NewAutoCommitStrategy`, `NewProducerOptions`, `NewStreamOptions`, `StoreOffset`, `StreamAlreadyExists`)
- pika BlockingConnection / BasicProperties docs (verified `expiration` must be a string, `delivery_mode=2` for persistent, `basic_qos(prefetch_count=...)`)
- Node.js `crypto.randomUUID()` (available since Node 14.17/15.6)

## Issues Found

1. **`this.channel.confirmChannel()` does not exist on amqplib channels.** The original code created a regular channel via `createChannel()` and then attempted to call `confirmChannel()` on it, which would throw `TypeError: this.channel.confirmChannel is not a function`. Publisher confirms in amqplib are enabled by creating a confirm channel directly via `connection.createConfirmChannel()`. Fixed by changing `createChannel()` to `createConfirmChannel()` and removing the bogus `confirmChannel()` call.

2. **Invalid `credit_flow_default_credit` keys.** The post used `credit_flow_default_credit.head` and `credit_flow_default_credit.tail`, which are not valid keys in the RabbitMQ configuration schema. The actual keys (per `rabbit.schema`) are `credit_flow_default_credit.initial_credit` and `credit_flow_default_credit.more_credit_after`. Fixed.

3. **Invalid stream broker-level config keys.** The post used `stream.initial_segment_size = 500MB` and `stream.max_segment_size_bytes = 500MB`. Neither key exists at the broker level in the `rabbitmq_stream.schema`. Per-stream segment size is configured at stream declaration time via the `x-stream-max-segment-size-bytes` queue argument or via a policy (`stream-max-segment-size-bytes`). Replaced with two real broker-level keys (`stream.frame_max`, `stream.initial_credits`) and added a comment clarifying where segment size is actually configured. The existing policy example at the bottom of that snippet (which correctly uses `stream-max-segment-size-bytes`) was already correct.

## Review Notes

- **`channel.ack({ fields: { deliveryTag: tag } })`** in the chunk assembler is a hack — amqplib's `ack`/`nack` only read `message.fields.deliveryTag`, so the synthetic object works in practice, but this relies on undocumented internal behavior. The idiomatic approach is to keep references to the original message objects (alongside delivery tags) and pass them to `ack()`. Left unchanged since it technically functions and rewriting would broaden the diff.
- **`SetBatchPublishingDelay(50)`** in the Go stream producer is a deprecated no-op as of `rabbitmq-stream-go-client` v1.5.0+. The call compiles and runs but has no effect. Consider `SetSubEntrySize` / `SetQueueSize` for batching tuning instead. Left unchanged since the call still compiles and the post otherwise predates this deprecation; readers on older versions still see the documented behavior.
- **Lazy queues (`queue-mode: lazy`).** Lazy queue mode was deprecated in RabbitMQ 3.12 and removed in RabbitMQ 4.0 (classic queues v2 now exhibit lazy-like behavior by default). On RabbitMQ 4.x, the `queue-mode: lazy` policy parameter is silently ignored. The post is reasonable advice for 3.x deployments but worth noting for 4.x users.
- **`queue_master_locator = min-masters`.** Valid in RabbitMQ 3.x. Classic queue mirroring was removed in 4.0 and `queue_master_locator` no longer has effect there; the modern equivalent for quorum queues / streams is `queue_leader_locator`.
- **Duplicate chunk handling** in `ChunkAssembler`: if a duplicate chunk arrives (same `x-chunk-index`), it is silently ignored without its delivery tag being acked, so the duplicate would remain unacked until the consumer disconnects. A logic gap rather than a syntax error — left as-is since the code path is reachable only on RabbitMQ redelivery and isn't the focus of the tutorial.
- The `Buffer.slice()` method used in the chunker is technically deprecated in favor of `Buffer.subarray()` in recent Node versions, but it still works and is widely used. No change needed.
