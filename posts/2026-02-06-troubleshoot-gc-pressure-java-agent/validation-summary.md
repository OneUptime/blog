# Validation Summary: How to Troubleshoot High GC Pressure and p99 Latency Spikes Caused by

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java SDK
- Java garbage collection
- JVM GC logging and jstat
- Prometheus alerting
- Spring-style manual tracing example

## Sources Consulted
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent performance guide: https://opentelemetry.io/docs/zero-code/java/agent/performance/
- OpenTelemetry Java agent instrumentation suppression: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry JVM metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/jvm-metrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Oracle java command reference for `-Xlog`: https://docs.oracle.com/en/java/javase/22/docs/specs/man/java.html
- Oracle Java troubleshooting guide for `jstat -gcutil`: https://docs.oracle.com/en/java/javase/25/troubleshoot/

## Issues Found
- Sampling was described as reducing span allocation by exactly 90%. Updated this to say it reduces recorded and exported span volume by about 90%, because head sampling reduces recording/export work but does not mean every instrumentation code path allocates zero objects.
- The high-volume instrumentation example disabled `jdbc-datasource` but discussed JDBC query spans. Added `otel.instrumentation.jdbc.enabled=false`, which is the relevant instrumentation name for JDBC query spans, and removed the undocumented `internal-class-loader` example from the user-facing recommendation.
- The BatchSpanProcessor section claimed a smaller queue while showing the default `otel.bsp.max.queue.size=2048`. Changed the example to `1024` and clarified that lower `schedule.delay` can reduce queue residency, while a full queue can drop spans.
- The JVM metric names used older `process.runtime.jvm.*` names. Updated them to current OpenTelemetry JVM semantic convention names: `jvm.gc.duration`, `jvm.memory.used`, and `jvm.memory.committed`.
- The Prometheus alert used `jvm_gc_pause_seconds_*`, which does not match the current OpenTelemetry `jvm.gc.duration` metric translation. Updated it to `jvm_gc_duration_seconds_sum` and `jvm_gc_duration_seconds_count`.

## Review Notes
The Java snippet is illustrative and omits surrounding Spring imports, dependency injection, and the `orderService` field. The tracing API usage shown for creating, scoping, and ending a span is technically valid.
