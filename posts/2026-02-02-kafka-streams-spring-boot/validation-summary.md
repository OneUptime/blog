# Validation Summary: How to Use Kafka Streams with Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka Streams (DSL, state stores, TopologyTestDriver)
- Spring Boot
- Spring Kafka (`@EnableKafkaStreams`, `KafkaStreamsConfiguration`, `StreamsBuilderFactoryBean`, `JsonSerde`)
- Jackson (`ObjectMapper`)
- Micrometer (metrics)
- Maven (dependency configuration)
- JUnit 5 (testing)

## Sources Consulted
- Apache Kafka Streams documentation: https://kafka.apache.org/documentation/streams/
- Kafka Streams DSL API reference (KStream, KTable, Branched, Materialized, Consumed, Produced, Grouped): https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/kstream/package-summary.html
- Spring for Apache Kafka reference (Streams support, `@EnableKafkaStreams`, `KafkaStreamsConfiguration`, `KafkaStreamsDefaultConfiguration.DEFAULT_STREAMS_CONFIG_BEAN_NAME`): https://docs.spring.io/spring-kafka/reference/streams.html
- Spring Kafka `JsonSerde` API (constructors accepting `Class<T>` and `ObjectMapper`): https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JsonSerde.html
- Kafka Streams Interactive Queries (`StoreQueryParameters.fromNameAndType`, `QueryableStoreTypes`): https://kafka.apache.org/documentation/streams/developer-guide/interactive-queries.html
- `exactly_once_v2` processing guarantee (introduced in Kafka 2.5, replacing the deprecated `exactly_once`): KIP-447
- `TopologyTestDriver`, `TestInputTopic`, `TestOutputTopic` (kafka-streams-test-utils): https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/TopologyTestDriver.html
- Spring Boot `spring.lifecycle.timeout-per-shutdown-phase` property: Spring Boot reference docs

## Issues Found
- **Test setup did not apply the topology to the builder**: In `OrderProcessingTopologyTest#setup()`, a `StreamsBuilder` and an `OrderProcessingTopology` instance were constructed, but `topology.buildPipeline(builder)` was never invoked. `testDriver = new TopologyTestDriver(builder.build(), props)` would therefore receive an empty topology, and the `highValueOrdersShouldBeRouted` assertions could never be satisfied. Added the missing `topology.buildPipeline(builder);` call after instantiating the topology, before building the test driver.

## Review Notes
- The `.split().branch(...).defaultBranch(...)` API (`Branched.withConsumer`) is correct for Kafka Streams 2.8+ and replaces the deprecated `KStream#branch(Predicate...)`.
- `StoreQueryParameters.fromNameAndType(...)` is the modern interactive-query entry point, correctly replacing the deprecated `KafkaStreams#store(String, QueryableStoreType)` overload.
- `exactly_once_v2` is the correct processing guarantee value (the legacy `exactly_once` was deprecated in Kafka 2.5 and removed in 4.0).
- `StreamsConfig.DEFAULT_DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG` is still functional but was deprecated in Kafka 3.9 in favor of the non-default-prefixed name (`deserialization.exception.handler` / `DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG`). Existing deployments do not need to change immediately, but readers building new code on Kafka 4.x may prefer the newer constant.
- Spring Kafka also ships `KafkaStreamsMicrometerListener` for binding Kafka Streams metrics automatically; the manual `MeterBinder` approach in the post is functional but is a more low-level alternative.
- The test uses `StringSerializer`/`StringDeserializer` for the input/output topics while the topology uses `JsonSerde<Order>`. This still works because the JSON payload is UTF-8 bytes either way, but readers extending the example should be aware that switching to a typed `TestInputTopic<String, Order>` would be a cleaner pattern.
