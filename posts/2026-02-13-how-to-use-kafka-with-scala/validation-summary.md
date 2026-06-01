# Validation Summary: How to Use Apache Kafka with Scala

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Scala
- Kafka Java clients
- Circe
- Akka Streams / Alpakka Kafka
- ZIO Kafka
- EmbeddedKafka
- ScalaTest

## Sources Consulted
- Apache Kafka 3.7 Producer Configuration: https://kafka.apache.org/37/configuration/producer-configs/
- Apache Kafka 3.7 Consumer Configuration: https://kafka.apache.org/37/configuration/consumer-configs/
- Apache Kafka 3.7 KafkaProducer Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka KafkaConsumer Javadocs: https://kafka.apache.org/38/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Alpakka Kafka consumer documentation: https://doc.akka.io/libraries/alpakka-kafka/current/consumer.html
- ZIO Kafka consuming and committing offsets documentation: https://zio.dev/zio-kafka/example-of-consuming-producing-and-committing-offsets/
- ZIO Kafka tutorial for stream offset batching: https://zio.dev/guides/tutorials/producing-consuming-data-from-kafka-topics/
- EmbeddedKafka README: https://github.com/embeddedkafka/embedded-kafka
- Circe generic derivation API documentation: https://circe.github.io/circe/api/io/circe/generic/AutoDerivation.html

## Issues Found
- The producer idempotence explanation overstated exactly-once semantics. Kafka idempotence prevents duplicate writes from producer retries, but end-to-end exactly-once processing requires transactions for atomic consume-process-produce workflows. Updated the paragraph to make this distinction.
- The manual consumer committed offsets even when deserialization or handler processing failed, which contradicted the explanation that failed messages should not be marked consumed. Updated the polling loop to commit only non-empty batches where all records were decoded and processed successfully.
- The EmbeddedKafka test used `localhost:6001` for the producer. EmbeddedKafka's default broker port is 6000 and controller port is 6001, so the producer should connect to `localhost:6000`. Updated the example.
- The EmbeddedKafka example imported `EmbeddedKafka._` but did not mix in the `EmbeddedKafka` trait as shown in the library's ScalaTest usage. Updated the test class to extend `EmbeddedKafka`.
- The test constructed a `BigDecimal` amount from a floating-point literal. Updated it to `BigDecimal("99.99")` to avoid floating-point precision surprises in the example.

## Review Notes
The core dependency snippet covers the plain Kafka/Circe examples. The Akka Streams, ZIO Kafka, EmbeddedKafka, and ScalaTest snippets require their corresponding dependencies in a real project.
