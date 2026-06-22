# Validation Summary: How to Get Started with Kafka Streams

## Status
validated

## Post Type
Tutorial / getting-started guide

## Technologies Covered
- Apache Kafka
- Kafka Streams
- Java
- Maven
- Gradle
- Stream processing
- Stateful processing and state stores
- Kafka Streams joins and windowed aggregations
- Kafka Streams error handling

## Sources Consulted
- Apache Kafka downloads and supported releases: https://kafka.apache.org/community/downloads/
- Kafka Streams Javadoc, `StreamsConfig`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/StreamsConfig.html
- Kafka Streams Javadoc, `KStream`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/KStream.html
- Kafka Streams Javadoc, `TimeWindows`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- Kafka Streams Javadoc, `SessionWindows`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/SessionWindows.html
- Kafka Streams Javadoc, `SlidingWindows`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/SlidingWindows.html
- Kafka Streams Javadoc, `JoinWindows`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/JoinWindows.html
- Kafka Streams Javadoc, `BranchedKStream`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/BranchedKStream.html
- Kafka Streams Javadoc, `KafkaStreams`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/KafkaStreams.html
- Kafka Streams Javadoc, `DeserializationExceptionHandler`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/DeserializationExceptionHandler.html
- Kafka Streams Javadoc, `DeserializationExceptionHandler.Response`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/DeserializationExceptionHandler.Response.html
- Kafka Streams Javadoc, `ProductionExceptionHandler`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/ProductionExceptionHandler.html
- Kafka Streams Javadoc, `StreamsUncaughtExceptionHandler`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/StreamsUncaughtExceptionHandler.html

## Issues Found
- The dependency examples used Apache Kafka 3.7.0, which is archived as of the review date. Updated Kafka Streams and Kafka clients examples to 4.3.0, the latest supported Apache Kafka release listed by the official downloads page.
- The post said Kafka Streams has "no external dependencies", which could imply no Kafka broker dependency. Changed this to "no separate processing cluster" to match Kafka Streams' actual deployment model.
- The transformations example used `KStream.through("intermediate-topic")`, which is not present in the Kafka Streams 4.3.0 Javadoc. Replaced it with writing to the intermediate topic using `to(...)` and reading it back with `builder.stream(...)`.
- The error-handling configuration used `DEFAULT_DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG` and `DEFAULT_PRODUCTION_EXCEPTION_HANDLER_CLASS_CONFIG`, which are deprecated in current Kafka Streams. Replaced them with `DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG` and `PRODUCTION_EXCEPTION_HANDLER_CLASS_CONFIG`.
- The custom deserialization handler used the old `handle(ProcessorContext, ...)` API and `DeserializationHandlerResponse.CONTINUE`. Updated it to `handleError(ErrorHandlerContext, ...)` and `DeserializationExceptionHandler.Response.resume()`.
- The uncaught exception handler lambda used two parameters, but `StreamsUncaughtExceptionHandler.handle` accepts a single `Throwable`. Updated the lambda to accept only the exception.

## Review Notes
The snippets remain illustrative and assume surrounding application classes, imports, serdes, topic creation, and domain models such as `Order`, `Payment`, and `CustomerStats`. The Jackson dependency remains as originally written because the post only uses it as an example JSON serialization dependency and does not tie the guide's Kafka Streams API correctness to a Jackson-specific feature.
