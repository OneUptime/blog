# Validation Summary: How to Design Kafka Topics and Partitions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka topics, partitions, replication, retention, and compaction
- Kafka command-line tools
- Java Kafka producer and consumer configuration
- Python kafka-python producer, consumer, and admin APIs

## Sources Consulted
- Apache Kafka producer configuration documentation: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka consumer configuration documentation: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka topic configuration documentation: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka basic operations documentation: https://kafka.apache.org/41/operations/basic-kafka-operations/
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html
- kafka-python KafkaAdminClient documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaAdminClient.html
- Confluent Kafka CLI tools reference: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html

## Issues Found
- The partition-key explanation said same-key messages always go to the same partition. I qualified this to the same partitioner and partition count because increasing partitions can change future key-to-partition mapping.
- The partition calculation example used floor division and showed `Output: 12`, but the provided inputs produce 24 after the growth factor and rounding. I changed the throughput calculation to use `math.ceil` and corrected the output to 24.
- The replication example with `min.insync.replicas=2` said it survived two broker failures. I changed the comment to say writes can continue after one broker failure, which matches `acks=all` durability behavior with a minimum of two in-sync replicas.
- The Python ordering example said manual offset commits provide exactly-once semantics. I changed this to at-least-once processing and clarified that committing after processing avoids reprocessing successful work after restart, but does not eliminate all duplicate scenarios.
- The producer ordering comment implied `max_in_flight_requests_per_connection=1` was the only strict-ordering option. I updated it to reflect current idempotent producer behavior, where values up to 5 preserve producer ordering when idempotence is enabled.
- The compacted-topic configuration store accepted `bootstrap_servers` but hardcoded `localhost:9092` when loading configs. I changed it to reuse the configured bootstrap servers.
- The kafka-python admin monitoring example treated `describe_topics()` results as objects, but kafka-python documents a list of dictionaries. I changed partition metadata access to dictionary access.
- The partition-increase example used `NewPartitions`, which kafka-python 3.0 documents as deprecated for `create_partitions()`. I changed it to pass a topic-to-total-count dictionary.
- The partition-increase warning said old keys may move. I clarified that existing records do not move, but future records for existing keys may hash to different partitions.

## Review Notes
The post is technically relevant and validated after fixes. Some recommendations, such as partition counts and monitoring thresholds, are rules of thumb rather than universal Kafka limits and should be tuned with production measurements.
