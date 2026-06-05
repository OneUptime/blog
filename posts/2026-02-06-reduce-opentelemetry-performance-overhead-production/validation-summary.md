# Validation Summary: How to Reduce OpenTelemetry Performance Overhead in Production by 50%

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Go SDK
- OpenTelemetry Collector and Collector Contrib
- OTLP/gRPC and OTLP/HTTP protocol considerations
- Prometheus and PromQL
- Kubernetes Deployments, QoS, and HorizontalPodAutoscaler
- Go runtime tuning

## Sources Consulted
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go OTLP exporter documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib redaction processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector/releases
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/3.4/querying/functions/
- Kubernetes Pod QoS documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes autoscaling/v2 HPA API documentation: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/

## Issues Found
- The benchmark snippet used a non-test filename and had unused imports. Changed the filename marker to `benchmark_instrumentation_test.go` and removed unused OpenTelemetry imports so `go test -bench` can discover the benchmarks.
- The Go batch processor example used `trace.WithBatchTimeout(5000)`, which is 5000 nanoseconds rather than 5 seconds. Changed it to `trace.WithBatchTimeout(5*time.Second)` and added the `time` import.
- The head-based sampling description implied that the sampler could always sample errors and slow requests. Updated the wording to clarify that the shown head sampler honors parent sampling decisions and applies ratio sampling to new traces; error and latency retention remains covered by tail sampling.
- The "adaptive sampling" Collector snippet used `attribute_source` as if it controlled a dynamic sampling rate and defined a filter that was not in the pipeline. Reworded the section as load shedding, removed the incorrect field, and added the filter processor to the pipeline.
- The `span_limiter` processor does not exist in the current Collector processor list. Replaced it with a valid transform processor using `limit(attributes, 50, [])`.
- The Collector deployment image was pinned to the old `otel/opentelemetry-collector-contrib:0.93.0`. Updated it to `0.153.0`, the current official release checked during review.
- The Kubernetes resource comment said a CPU limit meant "No CPU throttling". Changed it to clarify that matching CPU request and limit is for Guaranteed QoS.
- The current Collector ignores `service.telemetry.metrics.address`. Replaced it with the documented `readers.pull.exporter.prometheus` configuration for binding internal metrics to `0.0.0.0:8888`.
- The network section incorrectly framed OTLP/HTTP as JSON-only. Updated it to clarify that OTLP/HTTP can also use Protobuf and that JSON should be avoided unless required.
- The selective instrumentation Go example was missing the `trace` import and had helper functions missing from the snippet. Added the correct import and minimal handlers.
- The instrumentation-library snippet imported gRPC instrumentation without using it and was not syntactically complete. Rewrote it as a small `configureHandlers` example using `otelhttp`.
- The PromQL examples averaged counter values directly. Updated them to use `rate()` before aggregation and changed Collector CPU/memory metrics to current Collector internal metric names.

## Review Notes
Collector YAML was validated with `otel/opentelemetry-collector-contrib:0.153.0 validate` for the corrected processor and internal telemetry configuration shapes. Go was not available in the local environment, so Go snippets were reviewed against official package documentation rather than compiled locally.
