# Validation Summary: How to Fix 'OutOfOrderSequenceException' in Kafka

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer
- Idempotent producers
- Kafka transactions
- Kafka producer configuration
- Kafka CLI tools
- JMX and Prometheus-style monitoring
- Java

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka `OutOfOrderSequenceException` Javadoc: https://kafka.apache.org/31/javadoc/org/apache/kafka/common/errors/OutOfOrderSequenceException.html
- Apache Kafka Monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka generated producer metrics: https://kafka.apache.org/32/generated/producer_metrics.html
- Apache Kafka `KafkaProducer` source/Javadocs in official repository: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java
- Apache Kafka `KafkaProducerMetrics` source in official repository: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/producer/internals/KafkaProducerMetrics.java
- Apache Kafka `TransactionsCommand` source in official repository: https://github.com/apache/kafka/blob/trunk/tools/src/main/java/org/apache/kafka/tools/TransactionsCommand.java

## Issues Found
- The post described idempotent producers as providing broad "exactly-once delivery." Changed this to the narrower Kafka producer guarantee: retried records are written at most once within a producer session.
- The root-cause table implied stateless producer restarts and normal leader elections directly cause stale broker sequence expectations. Updated the wording to distinguish stateless producer restarts from transactional producer recovery and producer-state availability.
- The section "Settings That Cause OutOfOrderSequenceException" incorrectly implied incompatible idempotence settings directly cause this exception. Updated it to explain that explicit conflicting settings throw `ConfigException`, while implicit idempotence can be disabled by conflicting settings.
- The max-in-flight scenario implied `max.in.flight.requests.per.connection=10` works with idempotence and directly creates sequence gaps. Updated it to state that values above 5 are incompatible with idempotence and can reorder records only when idempotence is disabled.
- The retry section promised exponential backoff but used only fixed `retry.backoff.ms`. Changed the wording to "backoff."
- The transactional retry example did not close the producer after `ProducerFencedException`. Added `producer.close()` to match Kafka's fatal-error guidance.
- The circuit breaker Java snippet had a final `producer` field without initialization. Added a constructor.
- The logging Java snippet referenced an undefined producer field and an undeclared `Metrics` API. Added a constructor-injected producer and replaced the metrics call with a comment indicating where application metrics should be emitted.
- The Prometheus/JMX examples used non-standard transaction abort metric names. Updated them to use Kafka's `txn-abort-time-ns-total` producer metric and made the record-error alert generic instead of relying on a non-standard `error` label.
- The recovery commands treated `__transaction_state` as a consumer group and used invalid `kafka-transactions.sh list --hanging` and `abort --start-sequence` syntax. Replaced them with current `kafka-transactions.sh list --duration-filter 0`, `find-hanging --topic ...`, and `abort --topic ... --partition ... --start-offset ...`.
- The closing recommendation treated all `OutOfOrderSequenceException` cases as requiring producer recreation. Updated it to match Kafka's documented nuance: transactional producers must be closed, while idempotent-only producers can technically continue but risk reordering pending records.

## Review Notes
The Java snippets remain illustrative and omit package/import boilerplate. Kafka producer metric names exposed to Prometheus depend on the JMX exporter or metrics pipeline naming rules, so deployments may need to adapt the PromQL metric names while preserving the underlying Kafka JMX metric selection.
