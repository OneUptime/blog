# Validation Summary: How to Implement Dead Letter Queue Patterns for Failed Message Handling

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Kafka Java client
- Kafka Python client
- RabbitMQ dead letter exchanges
- RabbitMQ AMQP 0-9-1 Go client
- NATS JetStream
- Kubernetes Deployments, Jobs, and ConfigMaps
- Prometheus alerting rules and PromQL

## Sources Consulted
- Apache Kafka `KafkaConsumer` Javadocs: https://kafka.apache.org/34/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka `KafkaProducer` Javadocs: https://kafka.apache.org/40/javadoc/org/apache/kafka/clients/producer/KafkaProducer
- Apache Kafka `ProducerRecord` Javadocs: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Go tutorial and maintained AMQP 0-9-1 client guidance: https://www.rabbitmq.com/tutorials/tutorial-one-go
- RabbitMQ `amqp091-go` client repository: https://github.com/rabbitmq/amqp091-go
- RabbitMQ definitions import documentation: https://www.rabbitmq.com/docs/definitions
- NATS JetStream consumer documentation: https://docs.nats.io/nats-concepts/jetstream/consumers
- NATS JetStream stream documentation: https://docs.nats.io/nats-concepts/jetstream/streams
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- kafka-python producer documentation: https://kafka-python.readthedocs.io/en/2.1.4/apidoc/KafkaProducer.html
- kafka-python consumer documentation: https://kafka-python.readthedocs.io/en/2.2.14/apidoc/KafkaConsumer.html

## Issues Found
- The Kafka section said Kafka does not have native DLQ support. This was too broad because Kafka Connect has DLQ-related behavior, while the plain Kafka consumer API does not. Changed the wording to scope the statement to Kafka's consumer API.
- The Kafka consumer example read a `retry_count` header that was never written, so failed records would never reach the configured retry limit. Replaced this with an in-memory retry counter keyed by topic, partition, and offset.
- The Kafka consumer used unqualified `commitSync()` after individual records. The official API commits offsets from the last poll for subscribed partitions, which can commit records that have not been processed yet. Changed the example to commit only the current record's partition offset with `commitSync(Map<TopicPartition, OffsetAndMetadata>)`.
- The Kafka DLQ producer sent asynchronously and then committed the source offset. Changed it to wait for the DLQ send to complete before committing the failed record.
- The RabbitMQ Go example used the old `github.com/streadway/amqp` package. Updated it to the RabbitMQ-maintained `github.com/rabbitmq/amqp091-go` package used by current RabbitMQ tutorials.
- The RabbitMQ retry example read an `x-retry-count` header that `basic.nack` with requeue does not increment. Replaced it with an in-memory attempt counter so the example actually reaches the `Nack(false, false)` DLQ path.
- The PromQL alert used uppercase `AND`. Changed it to the documented lowercase `and` logical operator.
- The Python Kafka reprocessing script assumed JSON payloads, while the Java DLQ producer example writes string values. Updated the script to deserialize and serialize strings, and changed the producer send to wait for completion before committing the DLQ offset.

## Review Notes
- The RabbitMQ retry counter is intentionally simple and local to the consumer process. For production-grade RabbitMQ retry workflows, a retry exchange/queue pattern, quorum queue delivery limits, or application-managed retry metadata would be more robust across multiple replicas and restarts.
- The NATS JetStream example demonstrates an application-level DLQ publish on the final delivery attempt. JetStream `max_deliver` controls redelivery attempts, but messages that reach the maximum delivery count remain in the stream unless the application handles or deletes them.
