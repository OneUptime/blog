# Validation Summary: Handle Pending Tail-Sampling Decisions During Rolling Deployments

## Status

validated

## Post Type

Guide

## Technologies Covered

- OpenTelemetry Collector and Collector Contrib
- Tail-sampling processor (`trace-complete` and `span-ingest` strategies)
- Load-balancing exporter and consistent trace-ID routing
- `groupbytrace` processor
- Pebble tail-storage extension
- Collector exporter queues, batching, retries, and graceful shutdown
- Kubernetes pod termination, rolling updates, EndpointSlices, and PodDisruptionBudgets

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 tail-sampling processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [OpenTelemetry Collector Contrib v0.159.0 tail-sampling configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [OpenTelemetry Collector Contrib v0.159.0 tail-sampling implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [OpenTelemetry Collector Contrib v0.141.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.141.0)
- [OpenTelemetry Collector Contrib v0.149.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.149.0)
- [OpenTelemetry Collector v0.159.0 service graph shutdown ordering](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/service/internal/graph/graph.go)
- [OpenTelemetry Collector v0.159.0 Collector shutdown path](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/otelcol/collector.go)
- [OpenTelemetry Collector Contrib load-balancing exporter documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md)
- [OpenTelemetry Collector Contrib `groupbytrace` processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbytraceprocessor/README.md)
- [OpenTelemetry Collector Contrib Pebble tail-storage limitations](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/tailstorage/pebbletailstorageextension/README.md#limitations)
- [OpenTelemetry Collector exporter helper implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/internal/base_exporter.go)
- [OpenTelemetry Collector persistent queue documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md#persistent-queue)
- [OpenTelemetry Collector Contrib tail-sampling telemetry documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)
- [OpenTelemetry Collector receiver helper telemetry documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/receiverhelper/documentation.md)
- [OpenTelemetry Collector exporter helper telemetry documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/documentation.md)
- [Kubernetes pod termination flow](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
- [Kubernetes container lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/#container-hooks)
- [Kubernetes PodDisruptionBudget documentation](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/#pod-disruption-budgets)
- [Kubernetes Deployment rolling-update documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#updating-a-deployment)
- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions)

## Issues Found

- The `groupbytrace` recommendation implied complete-trace atomic dispatch. It was corrected to describe atomically dispatching each trace group collected during a bounded wait and to preserve the requirement that all spans reach the same upstream Collector instance; later spans can still form another group.
- The termination grace-period budget omitted `preStop` execution. The text now states that the grace timer starts before the hook and includes hook execution and any routing-drain delay.
- Exporter shutdown was described as draining every queue and allowing bounded network retries. The text now scopes draining to in-memory exporter queues and budgets for in-flight and final export attempts; persistent queues retain unsent entries, and exporter-helper retry handling stops before the in-memory queue is drained.
- The PodDisruptionBudget statement implied that a PDB controls a rolling upgrade. It now distinguishes eviction-based voluntary disruptions from Deployment and StatefulSet rollouts and explains that replacements must separately wait for terminating pods to avoid overlapping state loss.
- The durable-queue recommendation could be read as saying that an ordinary persistent sending queue restores accepted tail-sampler state. It now requires a replayable durable buffer with explicit retention, acknowledgment, and replay semantics and explains why already acknowledged spans cannot be reconstructed by a normal upstream sending queue.

## Review Notes

Both YAML examples use valid current fields and policy values. The review was performed against OpenTelemetry Collector and Collector Contrib v0.159.0; `drop_pending_traces_on_shutdown` requires Collector Contrib v0.141.0 or later, while `sampling_strategy` and `span-ingest` require v0.149.0 or later. The relevant current-source tail-sampling package tests pass. Tail-sampling and Collector pipeline metric names used for rollout measurements have Development or Alpha stability, so monitoring configurations should be checked when upgrading.
