# Validation Summary: How to Monitor CRI-O Container Runtime gRPC Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- CRI-O
- Kubernetes kubelet tracing
- Kubernetes Container Runtime Interface
- Prometheus metrics

## Sources Consulted
- CRI-O tracing guide: https://github.com/cri-o/cri-o/blob/main/tutorials/tracing.md
- CRI-O configuration reference: https://github.com/cri-o/cri-o/blob/main/docs/crio.conf.5.md
- CRI-O command reference: https://github.com/cri-o/cri-o/blob/main/docs/crio.8.md
- CRI-O metrics guide: https://github.com/cri-o/cri-o/blob/main/tutorials/metrics.md
- Kubernetes system component tracing documentation: https://kubernetes.io/docs/concepts/cluster-administration/system-traces/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md

## Issues Found
- The CRI-O sampling comments described the value as a 0.0-to-1.0 rate, but CRI-O uses `tracing_sampling_rate_per_million`. Updated the comments to describe per-million sampling values.
- The Collector filter processor example used older include/exclude span-name syntax. Updated it to the current OTTL-based `trace_conditions` form.
- The Kubernetes tracing section said Kubernetes 1.27+ supports both API server and kubelet tracing without noting current stability. Updated it to state that system component tracing is beta from 1.27 and kubelet tracing is stable in 1.34+.
- The metrics section implied CRI-O metrics are available without configuration. Added the required `[crio.metrics] enable_metrics = true` snippet.
- Several CRI-O metric names were incorrect or obsolete, including `crio_operations_latency_microseconds_bucket` and `crio_image_pulls_duration_seconds`. Replaced them with metric names from the CRI-O metrics guide.
- The production sampling strategy claimed tail sampling could keep all slow and error traces after source sampling at 1%. Corrected the example to export all spans from CRI-O when tail sampling is expected to preserve slow/error traces, and added a probabilistic tail-sampling policy for routine traces.

## Review Notes
The CRI-O tracing table is marked experimental in the current CRI-O configuration reference, so span names and attributes may still change across CRI-O versions. Tail sampling also requires all spans for a trace to reach the same Collector instance, which should be considered in multi-replica Collector deployments.
