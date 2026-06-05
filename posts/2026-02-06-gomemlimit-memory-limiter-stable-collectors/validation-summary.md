# Validation Summary: How to Set Up GOMEMLIMIT and Memory Limiter for Stable Collectors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory limiter processor
- OpenTelemetry Collector internal telemetry
- Go runtime memory management and GOMEMLIMIT
- Kubernetes Deployments and Downward API
- Prometheus and Grafana monitoring

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector scaling documentation: https://opentelemetry.io/docs/collector/scaling/
- OpenTelemetry Collector resource detection processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
- Go runtime environment variable documentation: https://pkg.go.dev/runtime#hdr-Environment_Variables
- Kubernetes Downward API resource field documentation: https://kubernetes.io/docs/tasks/inject-data-application/downward-api-volume-expose-pod-information/
- OpenTelemetry tail sampling processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/samplingprocessor/tailsamplingprocessor
- OpenTelemetry cumulative-to-delta processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/cumulativetodeltaprocessor

## Issues Found
- The memory limiter semantics were reversed. The post described `limit_mib` as the soft limit and hard limit as `limit_mib + spike_limit_mib`; official documentation defines `limit_mib` as the hard limit and the soft limit as `limit_mib - spike_limit_mib`. Updated the explanation, diagram labels, examples, and comments.
- The basic Kubernetes Deployment example was invalid because `apps/v1` Deployments require a selector matching pod template labels. Added `selector.matchLabels` and template labels.
- The basic Kubernetes environment example defined `GOMEMLIMIT` twice. Changed the Downward API variant into a commented replacement example.
- The Collector image tag `0.93.0` was outdated for a current guide. Updated examples to `0.153.0`, the latest official release found during review.
- The production Collector config used deprecated `resourcedetection` naming and an invalid `k8s` detector. Updated the processor type to `resource_detection` and used documented detectors.
- The internal telemetry configuration used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced it with the documented pull Prometheus reader configuration.
- Runtime metric names used older/non-current names such as `runtime.go.mem.heap_alloc` and `runtime_go_mem_heap_alloc_bytes`. Updated monitoring and dashboard examples to current documented Collector internal metric names.
- The cumulative-to-delta example included an invalid `max_stale` field. Removed it and kept the documented `max_staleness` field.
- The tail sampling example stated the wrong `num_traces` default. Updated the default from `100000` to `50000` and adjusted the reduced example value.

## Review Notes
The guide is technically relevant and useful after correction. Future updates should re-check OpenTelemetry Collector configuration syntax because several service telemetry and component names are still changing before a final 1.0 Collector configuration schema.
