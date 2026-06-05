# Validation Summary: How to Debug Memory Leaks in Production Using OpenTelemetry Runtime Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry runtime metrics
- Java/JVM runtime metrics
- Node.js runtime metrics
- Python system and runtime metrics
- Prometheus/PromQL alerting
- Kubernetes kubectl commands
- Java heap dumps and Node.js heap snapshots
- Python tracemalloc

## Sources Consulted
- OpenTelemetry JVM metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/jvm-metrics/
- OpenTelemetry Java runtime telemetry library README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/instrumentation/runtime-telemetry/runtime-telemetry-java17/library
- OpenTelemetry Node.js runtime instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-runtime-node
- OpenTelemetry Node.js runtime metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/nodejs-metrics/
- OpenTelemetry V8 JS engine metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/v8js-metrics/
- OpenTelemetry Python system metrics instrumentation source and README: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation/opentelemetry-instrumentation-system-metrics
- OpenTelemetry Prometheus/OpenMetrics compatibility spec: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#deriv
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Oracle jcmd command reference: https://docs.oracle.com/en/java/javase/22/docs/specs/man/jcmd.html
- Node.js v8.writeHeapSnapshot documentation: https://nodejs.org/api/v8.html#v8writeheapsnapshotfilenameoptions

## Issues Found
- Corrected JVM metric names in the Java comments from plural forms (`jvm.threads.count`, `jvm.classes.loaded`) to current OpenTelemetry semantic convention names (`jvm.thread.count`, `jvm.class.loaded`).
- Corrected Node.js runtime metric examples from non-current `nodejs.memory.*`, `nodejs.event_loop.delay`, and `nodejs.gc.duration` names to the current `v8js.*` and `nodejs.eventloop.*` names emitted by the runtime-node instrumentation.
- Updated Python metric examples from deprecated `process.runtime.cpython.*` examples to current `process.memory.*` and `cpython.gc.*` examples while keeping `system.memory.usage`.
- Corrected PromQL examples from `process_runtime_jvm_*` metric names and `type="heap"` to Prometheus-normalized OpenTelemetry JVM metric names and labels, such as `jvm_memory_used_bytes{jvm_memory_type="heap"}` and `jvm_gc_duration_seconds_*`.
- Removed `jhat` from the Java heap dump analysis recommendation because it is obsolete in current JDKs; replaced it with Eclipse MAT, VisualVM, or JDK Mission Control.
- Corrected the Node.js heap snapshot example because `v8.writeHeapSnapshot()` returns the written filename, not a stream, and removed the unused `fs` import.
- Adjusted the Python `tracemalloc` example so `top_allocator` is selected from positive allocation diffs instead of potentially reporting the largest absolute negative diff.

## Review Notes
The examples remain illustrative and assume existing SDK setup, exporters, service resource labels, authentication middleware, and application functions. The Prometheus label `service_name` depends on the exporter and resource-to-label configuration in use.
