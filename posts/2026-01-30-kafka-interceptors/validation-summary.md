# Validation Summary: How to Create Kafka Interceptors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka Java client
- Kafka producer interceptors
- Kafka consumer interceptors
- Java
- Java Cryptography Architecture
- JUnit 5

## Sources Consulted
- Apache Kafka 4.3.0 `ProducerInterceptor` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/ProducerInterceptor.html
- Apache Kafka 4.3.0 `ConsumerInterceptor` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerInterceptor.html
- Apache Kafka 4.3.0 `ProducerRecord` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- Apache Kafka 4.3.0 `ConsumerRecord` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html
- Apache Kafka 4.3.0 `ProducerConfig` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/ProducerConfig.html
- Apache Kafka 4.3.0 `ConsumerConfig` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerConfig.html
- Apache Kafka 4.3.0 `Configurable` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/common/Configurable.html
- Apache Kafka producer interceptor implementation reference: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/producer/internals/ProducerInterceptors.java
- Java Cryptography Architecture `Cipher` Javadoc: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/javax/crypto/Cipher.html

## Issues Found
- Updated the `ProducerInterceptor` and `ConsumerInterceptor` interface snippets to include `AutoCloseable`, matching current Kafka client APIs.
- Corrected the producer interceptor prose to note that `configure()` is inherited from `Configurable` and current producer acknowledgement callbacks have default implementations.
- Fixed the tracing producer configuration example. `Map<String, ?>.getOrDefault(..., "unknown-app")` can fail Java generic type checking, so it now reads the value as `Object` and converts safely.
- Corrected producer thread-safety wording. Kafka documents producer interceptor callbacks as potentially called from multiple threads, so the lifecycle table now says `onSend()` runs on application send thread(s).
- Removed the metrics example's claimed latency tracking and unused correlation map because the shown acknowledgement callback did not receive enough information to correlate the stored timestamp.
- Reworked the consumer tracing example to avoid a misleading `ThreadLocal` batch-level trace context. It now logs per-record trace IDs rather than implying downstream application code can reliably read a single current trace ID for a batch.
- Corrected the producer interceptor chain diagram. Kafka invokes producer acknowledgement callbacks in configured interceptor order, not reverse order.
- Updated the encryption/decryption examples to use `AES/GCM/NoPadding` with a per-message IV in headers instead of provider-default `AES`, which commonly maps to insecure ECB mode.
- Corrected the error handling example. Kafka catches and logs interceptor exceptions, so throwing from `onSend()` does not provide the fail-closed behavior the original post described.
- Adjusted the performance table's exception-handling advice to emphasize returning a known-good record and controlling logging.

## Review Notes
The post is now technically accurate for current Kafka Java client APIs. The validation and filtering examples are intentionally simplified; in production, filtering records in a consumer interceptor should be paired with an explicit offset-handling strategy so invalid records are not silently skipped.
