# Validation Summary: How to Build Stream Processing Architecture

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough with architecture explanations, code examples, and use cases.

## Technologies Covered
- Apache Kafka (KRaft mode, Confluent Platform 7.5.0)
- Docker Compose
- kafkajs (Node.js client)
- Kafka Streams (Java DSL)
- Event Sourcing / CQRS patterns
- Stream-table joins, windowed aggregations

## Sources Consulted
- kafkajs producer docs: https://kafka.js.org/docs/producing
- kafkajs consumer docs: https://kafka.js.org/docs/consuming
- Confluent Platform Kafka Docker docs (KRaft listener configuration)
- Apache Kafka Streams DSL reference (TimeWindows, Materialized, EXACTLY_ONCE_V2)
- kafka-topics.sh CLI reference

## Issues Found

1. **Producer constructor used `acks: -1`, which is not a valid kafkajs producer option.** In kafkajs, `acks` is a parameter of `producer.send()`, not the producer constructor. Fixed by removing `acks: -1` from the constructor and adding it to both `producer.send()` calls (`sendEvent` and `sendEventBatch`). Also added a clarifying note that `idempotent: true` automatically enforces `acks=-1`.

2. **Incorrect comment on `maxInFlightRequests`.** The comment claimed it was "Maximum time to wait for acknowledgments" — in kafkajs it is the maximum number of concurrent in-flight requests, not a timeout. Comment corrected.

3. **Misplaced comment in consumer constructor.** The comment "Start from the earliest message if no offset is stored" was attached to `sessionTimeout`, which is unrelated. Replaced with a correct description of what `sessionTimeout` controls.

4. **`eachBatchAutoResolve: true` inside an `eachMessage` handler had no effect.** That option only applies when using `eachBatch`. The accompanying comment "Set to higher number for batching" was also wrong since the option is a boolean. Removed the line and consolidated the comment.

5. **`consumer.subscribe({ topic, ... })` used the deprecated singular form.** Modern kafkajs uses `topics: [...]` (array). Updated to `topics: [topic]`.

## Review Notes

- The Docker Compose KRaft setup uses the well-known Confluent example `CLUSTER_ID` (`MkU3OEVBNTcwNTJENDM2Qk`). It is a valid 22-char base64-encoded UUID and works fine for a local demo; production deployments should generate their own with `kafka-storage random-uuid`.
- With only 3 brokers and `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3` / `KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3`, the cluster cannot tolerate a broker outage during bootstrap. Acceptable for a tutorial, worth noting for production sizing.
- Kafka Streams APIs used (`TimeWindows.ofSizeWithNoGrace`, `EXACTLY_ONCE_V2`, `Materialized.as`, `Window.startTime()`) are current and correct for Kafka 3.0+.
- `parseInt(message.headers['retry-count'] || '0')` in the DLQ handler omits the radix and treats the header as a string; kafkajs delivers headers as `Buffer`. This is a minor robustness concern but not a correctness bug for the shown happy path, so left as-is to preserve the author's brevity.
- `kafka-topics.sh` invocation and all flag/option names are correct against the current Kafka CLI.
