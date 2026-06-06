# Validation Summary: How to Collect JVM Metrics with the JMX Receiver in the Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java Management Extensions (JMX)
- Java Virtual Machine (JVM) runtime metrics
- OpenTelemetry Collector
- OpenTelemetry JMX Scraper
- OpenTelemetry OTLP metrics pipeline
- OpenTelemetry JVM metric semantic conventions

## Sources Consulted
- OpenTelemetry Java JMX Metrics documentation, https://opentelemetry.io/docs/languages/java/jmx/
- OpenTelemetry Java Contrib JMX Scraper README, https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-scraper/README.md
- OpenTelemetry Collector Contrib JMX receiver README, https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jmxreceiver/README.md
- OpenTelemetry JVM metric semantic conventions, https://opentelemetry.io/docs/specs/semconv/runtime/jvm-metrics/
- OpenTelemetry Java Instrumentation JVM JMX metric definitions, https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/jvm.md
- OpenTelemetry Java Contrib release assets, https://github.com/open-telemetry/opentelemetry-java-contrib/releases
- Oracle Java Management Extensions guide, https://docs.oracle.com/javase/8/docs/technotes/guides/management/agent.html

## Issues Found
- The post used the deprecated Collector `jmxreceiver` with `jar_path` and `target_system`. I updated the setup to run the standalone OpenTelemetry JMX Scraper and send metrics to an OTLP receiver in the Collector.
- The post referenced the old JMX Metric Gatherer JAR and a stale `v1.33.0` download URL. I updated the download and commands to use the current JMX Scraper JAR release path for `v1.57.0`.
- The post claimed a JDK was required. The current JMX Scraper runs as a Java process and requires a Java runtime, so I changed the package example to `openjdk-17-jre-headless` and clarified that `java` must be available.
- Several metric names were outdated or not emitted by the current JVM JMX target, including `jvm.memory.heap.used`, `jvm.threads.count`, `jvm.classes.loaded`, and `jvm.gc.collections.*`. I replaced them with current semantic convention names such as `jvm.memory.used`, `jvm.thread.count`, `jvm.class.count`, and `jvm.cpu.time`.
- The post said the JVM JMX target automatically collects `jvm.gc.duration`. The current YAML-based JMX Scraper does not support that notification-based metric, so I clarified that GC pause histograms require OpenTelemetry Java agent runtime telemetry.
- The multiple-application and authentication examples used receiver instances and receiver-local credentials. I changed them to separate JMX Scraper commands with `otel.service.name`, `otel.jmx.username`, and `otel.jmx.password`.

## Review Notes
- The legacy Collector JMX receiver is still documented for compatibility, but it is deprecated. The post now points readers at the non-deprecated scraper plus Collector OTLP pipeline.
- The remote JMX startup examples are suitable as illustrative examples, but production RMI hostname, TLS, and password/access file details often need environment-specific hardening.
