# Validation Summary: How to Fix OpenTelemetry Collector OOM Kills by Configuring GOMEMLIMIT

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory_limiter processor
- Go runtime GOMEMLIMIT
- Kubernetes Deployments
- Collector internal telemetry metrics

## Sources Consulted
- OpenTelemetry Collector memory_limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector v0.121.0 memory_limiter README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.121.0/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector architecture and pipeline documentation: https://opentelemetry.io/docs/collector/architecture/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Go runtime environment variable documentation: https://pkg.go.dev/runtime#hdr-Environment_Variables
- Go garbage collector guide: https://go.dev/doc/gc-guide
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post described `limit_mib` and `limit_percentage` as the threshold where the Collector starts refusing data. OpenTelemetry documents these as hard limits; the soft refusal limit is calculated as hard limit minus spike limit. Updated the absolute example, percentage example, diagram, log example, and explanatory text to distinguish the soft refusal limit from the hard GC limit.
- The post said the memory_limiter triggers garbage collection whenever memory exceeds the soft limit. OpenTelemetry documents refusal at the soft limit and forced garbage collection above the hard limit. Updated the "What Happens When the Limiter Kicks In" section accordingly.
- The post used `spike_limit_percentage: 25` with `limit_percentage: 75` while implying refusal at 75% of memory. That configuration creates a 50% soft limit. Updated it to `spike_limit_percentage: 15` and clarified the hard and spike percentages.
- The Kubernetes Deployment examples omitted the required `spec.selector` and matching pod labels for `apps/v1` Deployments. Added selectors and pod labels to both snippets.
- The complete Collector config used the deprecated `service.telemetry.metrics.address` field. Replaced it with the documented `service.telemetry.metrics.readers` Prometheus pull exporter configuration.
- The monitoring section referenced `otelcol_processor_refused_spans`, which is not listed in the current Collector internal telemetry documentation. Updated it to `otelcol_receiver_refused_spans`, which is the documented metric for spans refused by receivers after errors returned to clients.
- The default Go runtime explanation said Go uses host memory to make GC decisions. Updated the wording to the documented behavior: `GOMEMLIMIT` defaults to a value that effectively disables the runtime memory limit unless explicitly set.

## Review Notes
The post is technically valid after the corrections. The Collector image version shown is `0.121.0`; internal telemetry metric names and service telemetry configuration have changed across Collector releases, so future refreshes should re-check those examples against the Collector version being recommended.
