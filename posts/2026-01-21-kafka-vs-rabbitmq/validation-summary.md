# Validation Summary: Kafka vs RabbitMQ: Which Message Broker to Choose

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- RabbitMQ
- Java Kafka client
- RabbitMQ Java client
- Kafka command-line tools
- RabbitMQ command-line tools
- AMQP, MQTT, and STOMP messaging protocols

## Sources Consulted
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Apache Kafka design documentation: https://kafka.apache.org/43/design/design/
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Kafka Java client Javadocs: https://javadoc.io/doc/org.apache.kafka/kafka-clients/latest/
- RabbitMQ Java tutorial: https://www.rabbitmq.com/tutorials/tutorial-one-java
- RabbitMQ Java client API guide: https://www.rabbitmq.com/client-libraries/java-api-guide
- RabbitMQ queues documentation: https://www.rabbitmq.com/docs/queues
- RabbitMQ exchanges documentation: https://www.rabbitmq.com/docs/exchanges
- RabbitMQ consumer acknowledgements documentation: https://www.rabbitmq.com/docs/confirms
- RabbitMQ monitoring documentation: https://www.rabbitmq.com/docs/monitoring
- RabbitMQ quorum queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ classic queue mirroring documentation: https://www.rabbitmq.com/docs/3.13/ha
- RabbitMQ delayed message exchange plugin: https://github.com/rabbitmq/rabbitmq-delayed-message-exchange

## Issues Found
- RabbitMQ retention and deletion wording was too absolute. Changed "until consumed" and "deleted after consumption" to acknowledge that queue messages are removed after acknowledgment or expiration.
- RabbitMQ replay capability was described as simply unavailable without plugins. Changed it to clarify that queues do not provide replay, while RabbitMQ Streams do.
- Hard-coded Kafka and RabbitMQ throughput numbers were presented as general facts. Changed them to workload-dependent ranges/descriptions because actual throughput depends heavily on message size, durability, batching, replication, queue type, hardware, and client settings.
- RabbitMQ memory behavior was described as primarily in-memory. Changed it to note that memory and disk behavior depends on queue type, durability, and memory pressure.
- RabbitMQ delayed messages were implied to be a built-in delayed exchange feature. Added that scheduled/delayed delivery requires TTL/dead-lettering or the delayed message exchange plugin.
- Kafka CLI examples omitted `--bootstrap-server`, and the producer performance test omitted required producer connection and throughput options. Updated the commands to include `--bootstrap-server localhost:9092`, `--producer-props bootstrap.servers=localhost:9092`, and `--throughput -1`.
- RabbitMQ HA guidance mentioned queue mirroring. Classic mirrored queues were removed starting with RabbitMQ 4.0, so this was changed to quorum queues or streams.

## Review Notes
The Java snippets are illustrative and omit imports and dependency declarations, but the Kafka and RabbitMQ APIs used are current and match the official client examples. The post remains a high-level comparison; performance and latency claims should be treated as directional rather than guarantees for a specific deployment.
