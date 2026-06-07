# Validation Summary: How to Use Apache Kafka with Python (confluent-kafka)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Apache Kafka
- confluent-kafka-python library
- librdkafka (C library)
- Apache Avro
- Confluent Schema Registry
- Consumer Groups / Rebalancing

## Sources Consulted
- librdkafka CONFIGURATION.md (authoritative source for confluent-kafka-python defaults): https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md
- confluent-kafka-python documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- confluent-kafka-python source (SerializingProducer): https://github.com/confluentinc/confluent-kafka-python/blob/master/src/confluent_kafka/serializing_producer.py
- Apache Avro 1.11.1 Specification (logical types): https://avro.apache.org/docs/1.11.1/specification/
- Confluent docs on Idempotent Producer vs Transactions / EOS

## Issues Found

1. **Production tuning table — `acks` default value was wrong.**
   - Before: `acks` default listed as `1`.
   - After: changed to `all`.
   - Why: librdkafka's default for `acks` is `-1` (i.e. `all`). The value `1` is the Java Kafka client default, not librdkafka's. Since confluent-kafka-python wraps librdkafka, the librdkafka default applies.

2. **Production tuning table — `batch.size` default value was wrong.**
   - Before: `batch.size` default listed as `16384`.
   - After: changed to `1000000`, and adjusted the recommended range to `65536-1000000` so it stays consistent with the new default.
   - Why: librdkafka's default for `batch.size` is `1000000` (1 MB), not `16384`. The `16384` value is the Java client default.

3. **Production tuning table — `enable.idempotence` purpose described incorrectly.**
   - Before: "Exactly-once semantics".
   - After: "Idempotent delivery (no duplicates on retry)".
   - Why: `enable.idempotence=true` provides idempotent producer guarantees (no duplicate messages from retries within a single producer session), not full exactly-once semantics. True EOS requires Kafka transactions configured with `transactional.id` and the `init_transactions()` / `begin_transaction()` / `commit_transaction()` API. This is a very common misconception that should not be propagated.

4. **Avro schema — `logicalType` placement was non-canonical.**
   - Before: `{"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"}` (field-level `logicalType`).
   - After: `{"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}}` (nested in the type, per spec).
   - Why: The Apache Avro specification states that `logicalType` is an attribute of the **type** object, not the field. While some parsers tolerate the field-level form, the nested form is the canonical/spec-compliant placement and works reliably across implementations.

## Review Notes

- **`SerializingProducer` is marked EXPERIMENTAL.** The class docstring warns it is "experimental and likely to be removed, or subject to incompatible API changes in future versions of the library." Confluent's recommendation is to use the standard `Producer` and invoke `AvroSerializer` manually on the key/value before calling `produce()`. The post's usage still works on current versions but readers building new code should be aware of this. Not fixed because it would require a larger restructure of the Avro section beyond a pure correctness fix.

- **`KafkaError._PARTITION_EOF` is only emitted when `enable.partition.eof=true`** in librdkafka, and that setting defaults to `false`. The consumer code that checks for `_PARTITION_EOF` is harmless (the branch just never fires by default) but readers should know they need to opt in to see this signal.

- **`max.in.flight.requests.per.connection: 5` with idempotence**: When `enable.idempotence=true`, librdkafka auto-enforces `max.in.flight.requests.per.connection<=5`, `acks=all`, `retries=INT32_MAX`, and FIFO queuing. The explicit setting in the example is consistent with this and harmless.

- **`cooperative-sticky` partition assignment strategy** is supported in librdkafka 1.6.0+ and is a valid modern choice for newer Kafka clusters — claim is accurate.

- **`AvroSerializer` constructor signature** `(schema_registry_client, schema_str, to_dict=None, conf=None)` matches the lambda usage in the post — correct.
