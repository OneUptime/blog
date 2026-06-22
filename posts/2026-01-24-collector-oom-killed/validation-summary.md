# Validation Summary: How to Fix 'Collector OOM Killed' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors: memory_limiter, batch, filter, attributes, probabilistic_sampler, tail_sampling
- OpenTelemetry Collector exporters and persistent sending queues
- OpenTelemetry Collector internal telemetry
- Kubernetes Deployments, Services, and HorizontalPodAutoscaler
- Prometheus alerting and PromQL
- Go runtime memory tuning with GOMEMLIMIT and GOGC

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector exporter helper sending queue documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector scaling documentation: https://opentelemetry.io/docs/collector/scaling/
- OpenTelemetry Collector OTLP receiver configuration reference: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/config.md
- Deprecated memory ballast package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/extension/ballastextension
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Horizontal Pod Autoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Collector internal metric examples used older Go/Prometheus runtime metric names. Updated them to current OpenTelemetry Collector metric names such as `otelcol_process_memory_rss`, `otelcol_process_runtime_total_alloc_bytes`, and `otelcol_process_runtime_heap_alloc_bytes`.
- The memory limiter alert and dashboard examples used `otelcol_processor_dropped_spans`, which is not the current metric recommended for memory limiter pressure. Updated the examples to use `otelcol_processor_refused_spans`.
- The GOMEMLIMIT examples used roughly 90% of a 1Gi container limit. Updated them to 800MiB to match current Collector guidance to set GOMEMLIMIT to about 80% of the hard memory limit.
- The batch processor example said `timeout: 5s` exports more frequently than the default. Updated the example to `timeout: 1s` and corrected the comment.
- The exporter queue section said queues can grow unbounded and that `queue_size` defaults to 5000. Updated this to describe bounded memory consumption during outages and corrected the default to 1000.
- The persistent queue example defined `file_storage` but did not enable it under `service.extensions`. Added the required `service` extension entry.
- The filter processor examples used older `traces.span` and `logs.log_record` configuration style. Updated them to the current `trace_conditions` and `log_conditions` syntax with explicit OTTL paths.
- The Kubernetes Service example described `ClientIP` session affinity as preserving trace continuity. Updated the comment to clarify that it pins clients but is not trace-ID aware.
- The Go runtime section still recommended memory ballast as deprecated but usable. Updated the current guidance to avoid memory ballast on modern Collector versions and keep the ballast config only as a legacy example.
- The production configuration used the older `service.telemetry.metrics.address` form. Updated it to the current `readers.pull.exporter.prometheus` schema.

## Review Notes
- The examples are now aligned with current OpenTelemetry Collector documentation. Tail sampling remains memory-intensive and, when scaled horizontally, requires trace-aware routing such as the load-balancing exporter for consistent decisions across collector replicas.
