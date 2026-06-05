# Validation Summary: How to Right-Size CPU and Memory for the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector configuration
- OpenTelemetry Collector processors, exporters, and internal telemetry
- Kubernetes Deployments and container resource requests/limits
- Prometheus and PromQL
- Go `GOMEMLIMIT`
- `telemetrygen`

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector scaling documentation: https://opentelemetry.io/docs/collector/scaling/
- OpenTelemetry Collector benchmarks documentation: https://opentelemetry.io/docs/collector/benchmarks/
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector `telemetrygen` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/README.md
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- Updated the transform processor example from the older `context: span` grouping style to current OTTL trace statement paths such as `span.attributes[...]`.
- Corrected memory limiter comments: `limit_mib` is the hard limit, `spike_limit_mib` defines the gap between soft and hard limits, refusals begin above the soft limit, and forced garbage collection happens above the hard limit.
- Replaced deprecated/ignored `service.telemetry.metrics.address` examples with current `service.telemetry.metrics.readers` Prometheus pull configuration.
- Removed the misleading standalone Prometheus exporter snippet for Collector self-metrics; self-metrics are configured under `service.telemetry`, not by adding a pipeline exporter alone.
- Updated monitoring metrics and PromQL to include `otelcol_processor_refused_spans` for memory limiter refusals while keeping `otelcol_receiver_refused_spans` for receiver-level refusals.
- Updated the Collector image reference from the outdated `otel/opentelemetry-collector-contrib:0.93.0` image to the current release image path and version `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.153.0`.
- Added the missing OTLP receiver to the memory-optimized Collector configuration so the referenced `otlp` receiver is defined.
- Added required `selector` and template labels to the Kubernetes Deployment example.
- Updated the final OpenTelemetry documentation link from the stale `/collector/performance/` path to the current Collector benchmarks page.

## Review Notes
The numeric CPU and memory sizing tables are heuristic starting points rather than official guarantees. They are reasonable as guidance, but production users should validate them with workload-specific load tests and Collector self-metrics.
