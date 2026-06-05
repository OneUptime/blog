# Validation Summary: How to Fix Missing Kafka Consumer Spans When OpenTelemetry Agent Cannot Hook

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java API
- OpenTelemetry messaging semantic conventions
- Apache Kafka producer and consumer clients
- Spring Kafka listeners
- Maven Dependency Plugin
- W3C Trace Context

## Sources Consulted
- OpenTelemetry Java instrumentation supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Java agent instrumentation enable/disable configuration: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Apache Kafka KIP-345 static membership: https://cwiki.apache.org/confluence/display/KAFKA/KIP-345%3A%2BIntroduce%2Bstatic%2Bmembership%2Bprotocol%2Bto%2Breduce%2Bconsumer%2Brebalances
- Apache Kafka ConsumerConfig Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerConfig.html
- Apache Maven Dependency Plugin dependency:tree goal: https://maven.apache.org/components/plugins-archives/maven-dependency-plugin-3.8.1/tree-mojo.html

## Issues Found
- The post said Kafka consumer spans frequently go missing because of consumer group behavior. Changed this to state the more accurate causes: unsupported versions, disabled instrumentation, non-instrumented processing, and missing propagated context.
- The post described consumer spans as direct child spans of producer spans. Updated the explanation and trace example to say producer and consumer spans are correlated, commonly through span links under current OpenTelemetry messaging conventions.
- The post stated the Java agent supports `kafka-clients 0.11.0 to 3.x`. Updated this to `Apache Kafka Producer/Consumer API 0.11+`, matching the current OpenTelemetry Java instrumentation supported-libraries documentation.
- The manual `poll()` example implied the agent cannot hook manual polling. Updated it to clarify that the agent can instrument `poll()`, but arbitrary post-poll application processing needs manual instrumentation or a supported framework callback if a separate processing span is required.
- The Spring Kafka section did not mention the supported Spring Kafka version range. Added that the Java agent supports Spring Kafka 2.7+.
- The rebalancing section claimed the agent can lose context during rebalancing as a known edge case. Replaced this with a narrower statement that rebalancing does not remove context already in Kafka headers, but can create apparent gaps when work is interrupted, retried, or moved.
- The `group.instance.id` example did not mention uniqueness. Added a note that each consumer instance needs a unique static membership id.
- The header propagation section implied missing `traceparent` means no consumer span. Updated it to clarify that missing producer context can make consumer spans root or unlinked, not necessarily absent.
- Added a warning to avoid duplicate manual spans if auto-instrumentation already covers the same Kafka calls.

## Review Notes
The Java snippets are illustrative and omit imports and setup code, but the OpenTelemetry API, Kafka header access, Kafka `ConsumerConfig.GROUP_INSTANCE_ID_CONFIG`, and Maven command usage are consistent with the referenced documentation. The OpenTelemetry messaging semantic conventions are still marked development, so exact span names and link/parent behavior may vary by Java agent version and semantic-convention stability opt-in settings.
