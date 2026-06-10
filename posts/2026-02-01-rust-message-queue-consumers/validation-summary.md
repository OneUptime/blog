# Validation Summary: How to Build Message Queue Consumers in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (async/await)
- lapin 2.3 (RabbitMQ client)
- async-nats 0.33 (NATS / JetStream client)
- tokio 1.35 (async runtime)
- serde / serde_json (serialization)
- tracing / tracing-subscriber (structured logging)
- anyhow / thiserror (error handling)
- RabbitMQ (AMQP 0.9.1)
- NATS JetStream

## Sources Consulted
- lapin 2.3.1 docs: https://docs.rs/lapin/2.3.1/lapin/
  - Consumer: https://docs.rs/lapin/2.3.1/lapin/struct.Consumer.html
  - Channel: https://docs.rs/lapin/2.3.1/lapin/struct.Channel.html
  - Delivery: https://docs.rs/lapin/2.3.1/lapin/message/struct.Delivery.html
  - BasicQosOptions: https://docs.rs/lapin/2.3.1/lapin/options/struct.BasicQosOptions.html
- async-nats 0.33.0 docs: https://docs.rs/async-nats/0.33.0/async_nats/
  - AckKind: https://docs.rs/async-nats/0.33.0/async_nats/jetstream/message/enum.AckKind.html
  - pull Consumer: https://docs.rs/async-nats/0.33.0/async_nats/jetstream/consumer/pull/index.html
  - stream Config: https://docs.rs/async-nats/0.33.0/async_nats/jetstream/stream/struct.Config.html
  - pull Config: https://docs.rs/async-nats/0.33.0/async_nats/jetstream/consumer/pull/struct.Config.html
  - Message: https://docs.rs/async-nats/0.33.0/async_nats/message/struct.Message.html
- tokio 1.x docs: https://docs.rs/tokio/

## Issues Found
1. **Missing `StreamExt` import in the RabbitMQ consumer loop.** The `consume_messages` function calls `consumer.next()` on a `lapin::Consumer` (which implements `futures_core::Stream`). `.next()` is provided by the `StreamExt` trait, which lapin does not re-export. As written, this code would fail to compile.
   - **Fix:** Added `use futures::StreamExt;` to the imports at the top of the RabbitMQ consumer code block.
   - **Fix:** Added `futures = "0.3"` to the `Cargo.toml` dependencies block (with a brief explanatory comment) so the imported trait is actually available.
   - The NATS section already imported `use futures::StreamExt;` correctly, so no change was needed there.

## Review Notes
- The unused imports `BasicProperties` and `Consumer` from `lapin::...`, and `BatchOptions` from `async_nats::jetstream::consumer::pull`, would generate `unused_imports` warnings but do not affect correctness. Left unchanged to match the author's style of pre-listing types in the import block.
- `BasicConsumeOptions { no_ack: false, .. }` is redundant (false is the default) but explicit for clarity. Left as-is.
- `delivery.delivery_tag` is technically a `DeliveryTag` newtype, but it's a transparent alias for `u64` (`LongLongUInt`), so passing it directly to `basic_ack` works.
- The phrasing "JetStream providing persistence and exactly-once delivery when you need it" is consistent with how NATS markets JetStream (via publisher message deduplication windows + consumer acks). Not strictly distributed-systems "exactly-once," but acceptable as a high-level description.
- All other code (lapin `basic_qos`/`basic_ack`/`basic_nack`/`basic_reject` signatures, `QueueDeclareOptions`, NATS `AckKind::Nak(Option<Duration>)`, `consumer.fetch().max_messages(N).messages()`, stream/pull Config field names, `msg.subject.to_string()`, `msg.payload` access) was verified against the 2.3.x lapin and 0.33.x async-nats docs and is correct.
- Versions cited (`lapin = "2.3"`, `async-nats = "0.33"`, `tokio = "1.35"`) are valid published versions. Readers in 2026 may want to bump to newer minor/major releases (especially async-nats, which has moved well past 0.33), but the code as shown is correct for the pinned versions.
