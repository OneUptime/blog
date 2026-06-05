# Validation Summary: How to Monitor Kafka Connect Connectors with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka Connect
- OpenTelemetry Java JMX Scraper
- OpenTelemetry Collector
- OpenTelemetry Python metrics SDK
- Kafka Connect REST API
- Java custom Kafka Connect sink tasks
- JMX
- Docker Compose

## Sources Consulted
- Apache Kafka monitoring documentation: https://kafka.apache.org/22/operations/monitoring/
- Apache Kafka Connect REST API user guide: https://kafka.apache.org/10/kafka-connect/user-guide/
- OpenTelemetry Collector JMX receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jmxreceiver/README.md
- OpenTelemetry Java Contrib JMX Scraper documentation: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-scraper/README.md
- OpenTelemetry Kafka Connect JMX metric rules: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/src/main/resources/jmx/rules/kafka-connect.yaml
- OpenTelemetry Kafka Connect JMX metric documentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/kafka-connect.md
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- Confluent Docker JMX monitoring documentation: https://docs.confluent.io/platform/current/installation/docker/operations/monitoring.html

## Issues Found
- The post recommended the OpenTelemetry Collector `jmx` receiver as the primary approach. That receiver is deprecated as of 2026-01-30, so I changed the guide to use the OpenTelemetry Java JMX Scraper and send metrics to the Collector over OTLP.
- The Collector configuration used a `jmx` receiver and `target_system: kafka-connect`. I replaced it with a JMX Scraper properties file and an OTLP Collector receiver pipeline.
- Several metric names used underscore-style or raw JMX-style names that do not match the current OpenTelemetry Kafka Connect JMX rules. I updated them to the documented OpenTelemetry metric names such as `kafka.connect.worker.connector.count`, `kafka.connect.source.record.write.count`, and `kafka.connect.sink.record.read.count`.
- The offset commit alert referenced a sink-specific success percentage metric name that is not produced by the current OpenTelemetry Kafka Connect rules. I changed it to use `kafka.connect.task.offset.commit.failure.ratio`.
- The Python REST health-check example created observable gauges but did not register callbacks that emitted `Observation` values. I rewrote the example so connector and task health are emitted through observable gauge callbacks.
- The Java custom connector snippet rethrew a caught checked `Exception` from `SinkTask.put`, which would not compile as written. I changed the rethrow to a `RuntimeException`, removed `var`, and added the missing imports and helper methods needed by the example.
- The conclusion still said the JMX receiver captures metrics. I updated it to refer to the JMX Scraper.

## Review Notes
- The REST health-check example polls the Kafka Connect REST API separately for connector and task gauges. This is technically valid but could be optimized in production by caching one REST poll per collection interval.
- The JMX Scraper example uses a placeholder JMX password and cluster name. In production, these should be injected through deployment-specific secret handling or environment variables.
