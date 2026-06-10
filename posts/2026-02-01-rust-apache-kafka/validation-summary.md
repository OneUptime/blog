# Validation Summary: How to Use Rust with Apache Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (edition 2021)
- Apache Kafka
- rdkafka crate (v0.36) — Rust client wrapping librdkafka
- librdkafka (C library)
- Tokio async runtime
- Serde / serde_json (for typed message serialization)
- futures crate (StreamExt, join_all)

## Sources Consulted
- rdkafka crate documentation: https://docs.rs/rdkafka/0.36.2/rdkafka/
- rdkafka GitHub repository: https://github.com/fede1024/rust-rdkafka
- librdkafka CONFIGURATION.md: https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md
- Apache Kafka producer configuration docs: https://kafka.apache.org/documentation/#producerconfigs
- Apache Kafka consumer configuration docs: https://kafka.apache.org/documentation/#consumerconfigs
- Apache Kafka idempotent producer / EOS documentation
- Tokio docs: https://docs.rs/tokio/ (signal::ctrl_c, sync::broadcast)
- futures crate docs: https://docs.rs/futures/ (StreamExt, future::join_all)

## Issues Found
No technical issues found.

The post is technically accurate. Specific items verified:

- `rdkafka = "0.36"` with `cmake-build` and `tokio` features — both are real, current Cargo features on the rdkafka crate.
- `ClientConfig::new().set(...).create()` builder pattern — correct API.
- `FutureProducer` / `FutureRecord::to(topic).key(...).payload(...)` — correct API; type inference works because `.key()` and `.payload()` pin `K` and `P` (both `str` in the basic example, `str` + `Vec<u8>` in the serde example).
- `producer.send(record, timeout).await` returns `OwnedDeliveryResult = Result<(i32, i64), (KafkaError, OwnedMessage)>` — the `Ok((partition, offset))` / `Err((err, _))` pattern matches.
- `StreamConsumer`, `Consumer` trait, `consumer.stream()`, `consumer.subscribe(&[...])`, `consumer.commit_message(&msg, CommitMode::Async/Sync)`, `consumer.commit_consumer_state(...)` — all real APIs in rdkafka 0.36.
- `Message` trait methods `topic()`, `partition()`, `offset()`, `payload()`, `key()` — correct.
- `KafkaError::PartitionEOF(i32)` variant — exists in rdkafka 0.36.
- librdkafka config keys used (`bootstrap.servers`, `message.timeout.ms`, `enable.idempotence`, `acks`, `retries`, `retry.backoff.ms`, `linger.ms`, `batch.size`, `compression.type`, `delivery.timeout.ms`, `group.id`, `auto.offset.reset`, `enable.auto.commit`, `auto.commit.interval.ms`) — all valid librdkafka properties.
- `brew install librdkafka` and `apt-get install librdkafka-dev` — correct package names.
- Tokio `signal::ctrl_c()` and `tokio::sync::broadcast::channel::<()>(1)` — correct.
- Delivery semantics explanation (at-most-once, at-least-once, exactly-once) — accurate, including the note that EOS requires idempotent producers plus transactional APIs plus consumer configuration.

## Review Notes

- The comment "This ensures exactly-once delivery semantics" attached to `enable.idempotence=true` mirrors language used in the official Apache Kafka documentation, which describes idempotent producer as guaranteeing "exactly-once" delivery for the lifetime of a single producer instance/partition. It's correct, though strictly speaking it's "exactly-once production" (no duplicates from retries within a session), not end-to-end EOS. The post's later "Delivery Guarantees" section correctly clarifies that end-to-end exactly-once requires transactional APIs, so a reader gets the full picture.
- Setting `retries=3` alongside `enable.idempotence=true` is technically valid (librdkafka only requires `retries > 0` when idempotence is on), but most production guidance recommends leaving `retries` at its high default. Not a correctness issue.
- `KafkaError::PartitionEOF(_)` will only appear in the consumer stream if `enable.partition.eof=true` is set (default is `false` in librdkafka). The match arm is harmless but won't fire under default config. Not a bug — just a non-obvious nuance.
- `batch.size=16384` matches the JVM client default but is well below librdkafka's default (`1000000`). Valid, just unusually small for librdkafka; throughput-sensitive users may want to revisit.
- The `auto.commit.interval.ms=5000` value matches the librdkafka default — setting it explicitly is harmless.
- The `dynamic-linking` feature mentioned as an alternative to `cmake-build` is a real rdkafka-sys feature.
