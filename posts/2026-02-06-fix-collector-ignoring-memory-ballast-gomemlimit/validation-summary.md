# Validation Summary: How to Fix the Collector Ignoring Memory Ballast Config After Upgrading to

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory ballast extension
- OpenTelemetry Collector memory_limiter processor
- Go runtime GOMEMLIMIT
- Kubernetes deployments
- OpenTelemetry Helm chart
- kubectl

## Sources Consulted
- OpenTelemetry Collector memory_limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Helm chart values.yaml: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- OpenTelemetry Helm chart upgrading guide: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/UPGRADING.md
- Go runtime environment variables documentation: https://pkg.go.dev/runtime#hdr-Environment_Variables
- Go 1.19 release notes: https://go.dev/doc/go1.19

## Issues Found
- The post described `GOMEMLIMIT` as directly telling the GC the maximum memory it should use. Updated this to describe it as a soft memory limit for the Go runtime, matching the Go runtime documentation.
- The Helm chart migration example manually set `GOMEMLIMIT` through `extraEnvs` and replaced `service.extensions` with an empty list. Updated the example to use the chart's built-in `useGOMEMLIMIT: true`, set a memory resource limit, and keep `health_check` in `service.extensions` because the chart documents it as mandatory for probes.
- The verification section listed older Prometheus metric names, `process_resident_memory_bytes` and `go_memstats_heap_inuse_bytes`. Updated them to current Collector internal telemetry metric names: `otelcol_process_memory_rss` and `otelcol_process_runtime_heap_alloc_bytes`.

## Review Notes
The Collector memory_limiter configuration fields in the post (`limit_mib`, `spike_limit_mib`, `limit_percentage`, and `spike_limit_percentage`) match the current official component documentation. The 80% `GOMEMLIMIT` recommendation is also consistent with OpenTelemetry Collector best practices and the Helm chart default behavior.
