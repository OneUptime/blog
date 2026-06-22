# Validation Summary: How to Debug Kafka Consumer Group Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka consumer groups
- Kafka command-line tools
- Kafka Java consumer API
- Kafka Java Admin API
- Spring Kafka deserialization error handling

## Sources Consulted
- Apache Kafka 4.3 basic operations documentation: https://kafka.apache.org/43/operations/basic-kafka-operations/
- Apache Kafka 4.3 consumer configuration reference: https://kafka.apache.org/43/configuration/consumer-configs/
- Apache Kafka 4.3 KafkaConsumer Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka 4.3 Admin Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/Admin.html
- Apache Kafka 4.3 AdminClient Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/AdminClient.html
- Apache Kafka 4.3 ConsumerGroupDescription Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/ConsumerGroupDescription.html
- Apache Kafka 4.3 GroupState Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/common/GroupState.html
- Spring Kafka reference documentation for ErrorHandlingDeserializer: https://docs.spring.io/spring-kafka/reference/kafka/serdes.html

## Issues Found
- The sample `kafka-consumer-groups.sh --describe --group` output included a leading `GROUP` column, but current Apache Kafka and Confluent examples for a single group show output beginning with `TOPIC`. Updated the example to match current output.
- The `CURRENT-OFFSET` and `LOG-END-OFFSET` descriptions were imprecise. Updated them to describe committed next-consume offset and partition end offset semantics.
- The total-lag `awk` command summed `$6`, which is only correct for output with a leading `GROUP` column. Updated it to skip only the header row and sum `$5`, matching current Kafka output.
- The Java diagnostic tool used `AdminClient` directly and `ConsumerGroupDescription.state()` / `ConsumerGroupState`, which Kafka 4.x documentation supersedes with the `Admin` interface and `groupState()` / `GroupState`. Updated the snippet to use current APIs.
- The checklist said `heartbeat.interval.ms` must be less than `session.timeout.ms / 3`, while Kafka documents it must be lower than `session.timeout.ms` and typically no higher than one third of that value. Updated the checklist wording.

## Review Notes
- Offset reset commands are valid, but reset operations require an inactive consumer group when executed.
- The Spring Kafka `ErrorHandlingDeserializer` snippet is valid when Spring Kafka is on the classpath; plain Kafka clients do not provide that class.
