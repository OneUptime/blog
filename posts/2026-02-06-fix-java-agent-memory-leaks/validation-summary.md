# Validation Summary: How to Fix Memory Leaks in the OpenTelemetry Java Agent

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java API and SDK
- JVM heap dumps and `jcmd`
- Eclipse MAT and VisualVM heap analysis
- Prometheus alerting

## Sources Consulted
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent instrumentation suppression: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java JMX/runtime metrics documentation: https://opentelemetry.io/docs/languages/java/jmx/
- OpenTelemetry JVM metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/jvm-metrics/
- OpenTelemetry Java API tracing documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java `Span` Javadocs: https://javadoc.io/doc/io.opentelemetry/opentelemetry-api/latest/io/opentelemetry/api/trace/Span.html
- Oracle `jcmd` documentation: https://docs.oracle.com/en/java/javase/25/docs/specs/man/jcmd.html
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/

## Issues Found
- The post described span attributes as retaining request/response objects. OpenTelemetry span attributes hold attribute values, not arbitrary Java request objects, so this was corrected to refer to large request/response payload strings.
- The post described the Batch Span Processor queue as growing unbounded. OpenTelemetry Java uses a bounded queue controlled by `otel.bsp.max.queue.size` with a default of 2048, and spans are dropped after the queue is full. The wording was corrected to describe bounded queue pressure.
- The JVM runtime metric names were outdated. Current OpenTelemetry JVM semantic conventions use names such as `jvm.memory.used`, `jvm.memory.used_after_last_gc`, `jvm.gc.duration`, `jvm.class.loaded`, and `jvm.class.count`; the post was updated accordingly.
- The post implied JVM runtime metrics must be enabled manually. The OpenTelemetry Java agent enables runtime telemetry by default, so the wording was changed to note that the shown property only turns it on if it had been disabled.
- The Prometheus alert used older/non-OpenTelemetry JVM labels and a max-memory metric name. It was updated to use translated OpenTelemetry metric names and the `jvm_memory_type="heap"` label.

## Review Notes
The Java span lifecycle example uses current OpenTelemetry API methods (`makeCurrent`, `setStatus`, `recordException`, and `end`). The heap dump command and JVM OOM heap dump flags are valid. The Spring Web MVC instrumentation disable property matches the documented Java agent instrumentation naming pattern.
