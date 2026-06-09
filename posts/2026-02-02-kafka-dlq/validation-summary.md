# Validation Summary: How to Route Failed Kafka Messages to DLQ Topics

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Apache Kafka (Dead Letter Queue patterns)
- Spring Kafka (Java) — `DeadLetterPublishingRecoverer`, `DefaultErrorHandler`, `ExponentialBackOffWithMaxRetries`, `@KafkaListener`
- KafkaJS (Node.js) — `Kafka`, `Consumer`, `Producer`
- Micrometer — `Counter`, `Timer`, `MeterRegistry`
- Prometheus alerting rules (YAML)
- Mermaid diagrams

## Sources Consulted
- Spring Kafka source on GitHub: https://github.com/spring-projects/spring-kafka
  - `DeadLetterPublishingRecoverer.java` (default destination resolver, `createProducerRecord` signature, `setHeadersFunction`)
  - `DefaultErrorHandler.java` (constructor, error classification)
  - `ExceptionClassifier.java` (`addNotRetryableExceptions`)
  - `ExponentialBackOffWithMaxRetries.java`
- KafkaJS configuration docs: https://kafka.js.org/docs/configuration
- KafkaJS consumer docs: https://kafka.js.org/docs/consuming
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Apache Kafka client API: `org.apache.kafka.common.TopicPartition`, `org.apache.kafka.common.header.Headers`

## Issues Found

1. **Incorrect default DLT suffix in comment** — The code comment for `DeadLetterPublishingRecoverer` stated the default naming convention appends `".DLQ"` to the original topic name. Spring Kafka's actual default (`DEFAULT_DESTINATION_RESOLVER` in `DeadLetterPublishingRecoverer`) appends `"-dlt"` (lowercase, hyphenated). Fixed the comment to reflect the actual suffix.

2. **Broken `CustomDLQRecoverer` override and missing imports** — Two related problems:
   - The class overrode `createProducerRecord(ConsumerRecord, TopicPartition, Exception)`, but the actual Spring Kafka 3.x signature is `createProducerRecord(ConsumerRecord<?, ?>, TopicPartition, Headers, byte[] key, byte[] value)`. The `@Override` annotation would have caused a compile error because no such parent method exists.
   - The `TopicPartition` class was used but never imported.
   
   Rewrote the class to use the idiomatic `setHeadersFunction(BiFunction<ConsumerRecord<?, ?>, Exception, Headers>)` API, which is the supported way to inject custom headers into DLQ records without overriding `createProducerRecord`. Added the missing imports (`TopicPartition`, `Headers`, `RecordHeaders`) and removed the unused `ProducerRecord` import. The diagnostic headers added are identical to the original intent.

3. **Misleading Prometheus alert description** — The rule `rate(kafka_dlq_messages_total[5m]) > 10` was described as "More than 10 messages per minute are being sent to DLQ". Prometheus `rate()` always returns a per-second rate (the `[5m]` is the lookback window), so `> 10` means more than 10 messages **per second**, not per minute. Updated the description to "per second" to match the expression.

## Review Notes

- The unused `import io.micrometer.core.instrument.Gauge;` in `DLQMetrics` will produce a compiler warning but does not affect behavior; left it untouched as it is not a technical error.
- The Node.js retry tracker is an in-memory `Map` keyed by `topic-partition-offset`. This works within a single process but state is lost on consumer restart and is not shared across consumer instances. The post does not claim otherwise, so this is a noted design caveat rather than an error.
- KafkaJS's `retry: { retries: 5 }` at the client level controls connection / API call retries; it does not wrap `eachMessage` handler errors. The post correctly relies on the manual try/catch in `processMessage` for handler-level retries, so the two mechanisms do not conflict.
- The first Java configuration declares `KafkaTemplate<String, String>` while `CustomDLQRecoverer` accepts `KafkaTemplate<Object, Object>`. In practice the recoverer constructor accepts `KafkaOperations<?, ?>`, but the Spring autowiring of the two beans together is not shown end-to-end in the post; readers wiring this in production may want to use a single shared template signature.
