# Validation Summary: How to Fix 'Exactly-Once' Semantics in Streaming

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Kafka
- kafka-python
- Apache Flink
- PostgreSQL
- psycopg2
- Kafka CLI tools
- Outbox pattern

## Sources Consulted
- Apache Kafka producer configuration documentation: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka producer API documentation for transactions and offset commits: https://kafka.apache.org/30/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html
- Apache Flink Kafka connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/kafka/
- Apache Kafka basic operations documentation: https://kafka.apache.org/41/operations/basic-kafka-operations/
- PostgreSQL INSERT / ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html
- Confluent Kafka Python transactional API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html

## Issues Found
- The post defined exactly-once as each record being processed exactly one time. Updated the wording to focus on output effects appearing once, and clarified that external side effects still require transactions or idempotency.
- The non-idempotent producer example implied that omitting `enable_idempotence=True` is enough to make a modern Kafka producer non-idempotent. Updated the example to explicitly disable idempotence and adjusted the best-practice wording to account for default-enabled idempotence in current clients.
- The Kafka transactional Python example used a non-unique transactional ID pattern for multiple running instances. Updated the constructor to accept an `instance_id` and use it in `transactional_id`.
- The Kafka transactional Python example called `send_offsets_to_transaction()` with `self.consumer.position(self.consumer.assignment())`, which is not the correct `kafka-python` API shape. Replaced it with a `{TopicPartition: OffsetAndMetadata}` map and `consumer.group_metadata()`.
- The Kafka transactional Python example decoded JSON directly from bytes with `json.loads(value)`. Updated it to decode UTF-8 bytes before parsing.
- The transaction abort handler only caught `KafkaError`, so transform errors could leave an open transaction. Changed it to catch all exceptions and abort before re-raising.
- The Flink example used deprecated `FlinkKafkaConsumer` and `FlinkKafkaProducer` APIs. Replaced them with current `KafkaSource` and `KafkaSink` usage, including `DeliveryGuarantee.EXACTLY_ONCE` and `setTransactionalIdPrefix()`.
- The outbox section claimed exactly-once across multiple systems. Adjusted the text to describe database/Kafka consistency more accurately and note that consumers should deduplicate by event ID.
- The outbox Kafka publish comment said the event ID was used as the key, but the code used the aggregate ID. Corrected the comment and clarified that `event_id` is sent as a deduplication header.
- The debugging command used `kafka-configs.sh` to check producer idempotence, but producer idempotence is client-side configuration and is not exposed that way by broker dynamic config. Replaced it with a client config check.
- The duplicate-checking `kafka-console-consumer.sh` pipeline could run indefinitely. Added `--timeout-ms 10000` so the command completes.
- The consumer group status snippet imported `ConsumerGroupDescription`, which is unnecessary for the shown kafka-python code. Removed the unused import.

## Review Notes
The Kafka and Flink examples are illustrative and still assume compatible broker/client versions and durable Kafka topic settings. For production, transaction IDs must remain stable for the same stateful processing shard and unique across concurrently running instances.
