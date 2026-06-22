# Validation Summary: How to Handle Poison Messages in Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Java client
- confluent-kafka Python client
- Dead letter queues
- Retry topics and exponential backoff
- Circuit breaker pattern
- Kafka consumer offset commits
- Kafka record headers and timestamps

## Sources Consulted
- Apache Kafka JavaDoc: KafkaConsumer commitSync and poll APIs - https://kafka.apache.org/23/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka JavaDoc: ProducerRecord constructors and timestamp semantics - https://kafka.apache.org/0100/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- Confluent Kafka Consumer documentation: offset management and commit behavior - https://docs.confluent.io/platform/current/clients/consumer.html
- confluent-kafka Python API documentation: Consumer.commit, Producer.produce, flush, callbacks, and headers - https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Apache Kafka documentation landing page for current official documentation context - https://kafka.apache.org/documentation/

## Issues Found
- Java DLQ example committed the source offset even if publishing to the DLQ failed. Updated the DLQ send failure path to throw an exception so the source offset is not committed after a failed DLQ write.
- Python DLQ example committed offsets after attempting a DLQ write even when the delivery callback reported failure. Updated it to collect callback errors, raise on DLQ delivery failure, and use synchronous offset commits.
- Retry example described a future `ProducerRecord` timestamp as a scheduled timestamp. Kafka record timestamps are metadata and do not schedule delivery by themselves, so the comment was corrected.
- Retry and replay examples used asynchronous producer sends immediately before committing consumer offsets. Updated the retry, retry-topic forwarding, and DLQ replay examples to wait for producer send completion before committing offsets.
- Retry topic consumer used `Thread.sleep` without handling or declaring the checked `InterruptedException`. Updated the method signature to declare `throws Exception`, which also covers synchronous producer send failures.
- Circuit breaker example could commit offsets for unprocessed records after breaking out of a polled batch. Updated it to commit only offsets for records actually processed or handled.
- Circuit breaker half-open branch processed one test record but committed the whole last poll. Updated it to commit only the tested record's offset.
- Best-practices header snippet passed strings and numeric values directly to Kafka headers. Updated it to pass UTF-8 byte arrays, matching Kafka's header API.

## Review Notes
- The examples are still illustrative rather than fully standalone compilable classes because some imports, constructors, and helper methods are omitted in later snippets.
- The deserialization wrapper pattern is technically plausible, but a null fallback can be ambiguous on compacted topics where tombstone records are valid.
- Retry delays implemented with retry topics require careful production design; Kafka record timestamps alone do not delay consumer visibility.
