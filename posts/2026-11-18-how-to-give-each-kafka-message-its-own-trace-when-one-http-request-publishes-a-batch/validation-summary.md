# Validation Summary: How to Give Each Kafka Message Its Own Trace in an HTTP Request Batch

## Status
validated

## Post Type
Technical implementation guide with a Java code example.

## Technologies Covered
- Java
- Apache Kafka producer API and record headers
- OpenTelemetry Java tracing, context propagation, and sampling
- W3C Trace Context and distributed tracing

## Sources Consulted
- OpenTelemetry Java API: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry SpanBuilder API: https://javadoc.io/static/io.opentelemetry/opentelemetry-api/1.48.0/io/opentelemetry/api/trace/SpanBuilder.html
- OpenTelemetry Java SDK, propagators, and samplers: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry messaging span conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Kafka conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry Spring Boot instrumentation controls: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- Kafka 4.1 producer API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Kafka 4.1 record API: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- Kafka 4.1 headers API: https://kafka.apache.org/41/javadoc/org/apache/kafka/common/header/Headers.html

## Issues Found
1. The example assumed that the configured propagator emits `traceparent`. Added explicit SDK tracer-provider and W3C Trace Context prerequisites, including matching consumer propagation. A no-op or differently configured propagator does not provide the asserted header.
2. The exported-span assertions did not account for sampling or asynchronous export. Specified an always-on sampler, a test exporter, and waiting for callbacks and export before checking results.
3. The producer span omitted required messaging metadata from the currently published conventions. Added the messaging system and operation names, operation type, tombstone indication for a null payload, and `error.type` in both failure paths. These additions preserve the independent-root design.
4. The code reused `messageId` as a Kafka key without explaining the uniqueness assumption. Clarified that this is a unique application-assigned identifier; ordinary Kafka keys are not unique message identifiers.

## Review Notes
- Confirmed the root-span, link, explicit-context injection, callback lifetime, exception recording, and status APIs. No deprecated API calls were identified in the example.
- The code never makes the message span current, so it does not replace the caller's active HTTP context. Captured span references can be ended from asynchronous callbacks.
- Kafka sends individual records while batching network traffic. Header removal deletes all values for a key before injection adds its replacement.
- Using the creation context as the processing parent is permitted for single-message processing. Batch processing requires links to represent multiple message contexts. Automatic consumer instrumentation must be configured consistently with the intended policy.
- Send completion follows producer acknowledgement settings and does not establish consumer completion or transaction commit. The void helper intentionally leaves delivery-result handling to the caller.
- Parent-based sampling uses its root sampler for these independent roots; a sampled link alone does not force sampling.
- Messaging conventions remain Development. The attributes were checked against the currently published conventions (1.45.0); older instrumentation may emit different names. The linked Kafka 4.1 documentation remains valid for the APIs used.
- All four technical documentation links in the original article resolved to the intended resources. The author profile is not evidence for technical claims.
- An independent follow-up compiled the current Java snippets with JDK 17, OpenTelemetry 1.62.0, and Kafka 4.1.0. A shared fixture for this post and the remote-parent post passed 97 assertions. Kafka checks used MockProducer and an in-memory exporter to verify independent roots, request links, exact traceparent values, concurrent requests, callbacks, synchronous failures, error.type, tombstones, and duplicate header replacement. No live broker, agent overlap, or backend integration was tested. There are no terminal commands or configuration blocks in the post.
- Format validation shortened the title to meet the 80-character limit and synchronized it with Blogs.json and this review heading.
