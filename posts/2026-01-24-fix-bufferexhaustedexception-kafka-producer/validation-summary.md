# Validation Summary: How to Fix 'BufferExhaustedException' in Kafka Producer

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Apache Kafka producer
- Kafka Java client
- Java concurrency utilities
- Micrometer metrics
- Kafka producer configuration and monitoring

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Monitoring, Producer metrics: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka `BufferExhaustedException` Javadoc: https://kafka.apache.org/38/javadoc/org/apache/kafka/clients/producer/BufferExhaustedException.html

## Issues Found
- The code imported `BufferExhaustedException` from `org.apache.kafka.common.errors`, but the current Kafka Java client class is `org.apache.kafka.clients.producer.BufferExhaustedException`. Updated the imports.
- Several standalone Java snippets omitted imports needed to compile, such as `Properties`, `Duration`, `KafkaProducer`, and Kafka producer classes. Added the missing imports while keeping the examples otherwise unchanged.
- The slow-broker example set `max.in.flight.requests.per.connection` to `10`. Apache Kafka requires this value to be `<= 5` when idempotence is enabled. Changed the example to `5` and added a note about the idempotence requirement.
- The semaphore rate-limiting example could leak a permit if `producer.send()` threw synchronously after `acquire()`. Wrapped the send call so the permit is released on synchronous failure.
- The bounded-queue example drained records into `KafkaProducer` without waiting for send completion, so the queue alone did not accurately provide producer backpressure. Updated the sender loop to wait for the send result before taking the next queued record.
- The monitoring example described `record-queue-time-avg` as a batch queue size. Updated the gauge name, method name, and description to reflect Kafka's documented metric: average time record batches spent in the send buffer.
- The complete solution used a Java multi-catch of `BufferExhaustedException | TimeoutException`, which cannot compile because `BufferExhaustedException` extends `TimeoutException`. Changed it to catch `TimeoutException`.
- The complete solution could leak a semaphore permit if `producer.send()` threw synchronously after acquiring the permit. Added release handling for synchronous `TimeoutException` and other runtime failures.
- Buffer utilization was described as a percentage while the code returns a `0.0` to `1.0` fraction. Updated comments and metric description to use "fraction."

## Review Notes
The overall explanation of producer buffering, `buffer.memory`, `max.block.ms`, batching, and buffer metrics matches the Kafka documentation. The buffer sizing formula remains a rule-of-thumb rather than an official Kafka sizing formula, so future revisions could add a caveat that real sizing should account for partition count, compression, request size limits, and application burst patterns.
