# Validation Summary: How to Implement Kafka Exactly-Once Transactions

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer and consumer clients
- Idempotent producers
- Kafka transactions and exactly-once semantics
- Consumer offset management
- Java
- JUnit 5

## Sources Consulted
- Apache Kafka producer configuration reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka KafkaProducer Java API documentation: https://kafka.apache.org/30/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Confluent consumer configuration reference for `isolation.level`: https://docs.confluent.io/platform/current/installation/configuration/consumer-configs.html
- Apache Kafka monitoring documentation for producer transaction metrics: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka MockProducer Java API documentation: https://kafka.apache.org/10/javadoc/org/apache/kafka/clients/producer/MockProducer.html

## Issues Found
- The delivery guarantee table described exactly-once as "messages delivered exactly one time," which overstates Kafka's guarantee. Updated it to describe exactly-once processing within Kafka when input offsets and output records are committed atomically.
- The idempotent producer section said enabling idempotence automatically sets `acks=all`, `retries=Integer.MAX_VALUE`, and `max.in.flight.requests.per.connection=5`. Kafka requires compatible values, and current defaults satisfy them, but conflicting explicit settings are not simply overwritten. Updated the explanation and code comment.
- The idempotent producer limitations said the guarantee only applies within a single partition. Kafka idempotence prevents duplicate appends caused by retries for a producer session across the partitions it writes to, but does not provide atomic multi-partition visibility. Updated the wording.
- The basic transaction example said sends are buffered. Transactional sends may be sent before commit, but remain invisible to `read_committed` consumers until commit. Updated the comment.
- The transaction error handling examples omitted `UnsupportedVersionException`, which Kafka documents as fatal for transactional operations. Added it to imports, fatal catch blocks, and the error-handling table.
- The robust transaction handler described linear backoff as exponential. Updated the comment to "Increasing backoff."
- The read-committed consumer example said auto-commit was disabled because offsets would be committed in a producer transaction, but that standalone example commits offsets manually. Updated the comment.
- The Last Stable Offset explanation identified the LSO as the first offset in an open transaction. Confluent's consumer config reference defines the poll boundary as one less than the offset of the first open transaction. Updated the explanation.
- The consume-transform-produce example caught fatal producer exceptions in a generic `Exception` block, which could incorrectly call `abortTransaction()` and continue. Added a fatal multi-catch that rethrows those exceptions to the outer shutdown handler.
- The transactional ID strategy table used a dynamic consumer `memberId` in the example. Updated it to a stable `instanceId`, because transactional IDs must remain stable for recovery and fencing.

## Review Notes
The examples remain illustrative and are not packaged as a buildable sample project. Future improvements could include a complete Maven or Gradle project and integration tests against a real Kafka broker to validate transaction behavior beyond what `MockProducer` can cover.
