# Validation Summary: How to Monitor ActiveMQ with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache ActiveMQ Classic
- OpenTelemetry Collector
- OpenTelemetry JMX Scraper and deprecated JMX receiver
- OpenTelemetry Java agent
- JMS
- Java OpenTelemetry API metrics and tracing
- JMX

## Sources Consulted
- Apache ActiveMQ Classic JMX documentation: https://activemq.apache.org/components/classic/documentation/jmx
- OpenTelemetry Collector Contrib JMX receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jmxreceiver/README.md
- OpenTelemetry Java Contrib JMX Scraper documentation: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-scraper/README.md
- OpenTelemetry Java instrumentation ActiveMQ JMX metrics: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/activemq.md
- OpenTelemetry Java instrumentation supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Java agent instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md

## Issues Found
- The post presented the Collector JMX receiver as the primary current approach. The receiver is deprecated as of January 30, 2026, so I updated the text to recommend the standalone JMX Scraper for new deployments while still documenting the receiver for existing deployments.
- The post described configuring the receiver with a Groovy script, but the shown config uses `target_system: activemq` and built-in definitions. I corrected the wording.
- The ActiveMQ metric names in the key metrics section were not the current built-in instrumentation names. I changed them to `activemq.message.queue.size`, `activemq.message.enqueued`, `activemq.message.dequeued`, `activemq.consumer.count`, `activemq.producer.count`, `activemq.memory.utilization`, `activemq.store.utilization`, and `activemq.temp.utilization`.
- The JMS consumer explanation said receive telemetry makes the consumer span a child of the producer span. Current OpenTelemetry Java agent documentation says enabling `otel.instrumentation.messaging.experimental.receive-telemetry.enabled=true` starts a new trace on the consumer side with a span link to the producer trace, so I corrected that explanation.
- The custom `process_order` span was started but not made current. I added `Scope` handling so nested work and downstream instrumentation run under that span.
- The consumer Java example referenced helper methods that were not defined. I added minimal method stubs so the example is syntactically complete.
- The DLQ monitoring collector snippet used an outdated/incorrect filter processor shape and implied the Collector filter processor creates alerts. I replaced it with a backend alert condition using the corrected DLQ metric and attributes.

## Review Notes
- The Collector JMX receiver configuration remains useful for existing deployments, but new production examples should eventually be migrated fully to a standalone JMX Scraper process that exports OTLP metrics to the Collector.
- The memory utilization metrics are exported as fractions with unit `1` in the current instrumentation definitions, even though their source JMX attributes are percent values.
