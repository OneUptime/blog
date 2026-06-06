# Validation Summary: How to Configure the Kubernetes Cluster Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Kubernetes Cluster Receiver (`k8s_cluster`)
- Kubelet Stats Receiver (`kubeletstats`)
- OpenTelemetry Collector processors and exporters
- Kubernetes RBAC
- Kubernetes Deployments and service accounts

## Sources Consulted
- OpenTelemetry Collector Contrib Kubernetes Cluster Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/README.md
- OpenTelemetry Collector Contrib Kubernetes Cluster Receiver generated metric docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/documentation.md
- OpenTelemetry Collector Contrib Kubernetes Cluster Receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/config.go
- OpenTelemetry Collector Contrib Kubelet Stats Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry Collector Filter Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Memory Limiter Processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases

## Issues Found
- Replaced the deprecated/removed `logging` exporter example with the current `debug` exporter and `verbosity: detailed`.
- Removed unsupported `distribution_interval` examples and replaced them with the supported `metadata_collection_interval` setting.
- Corrected metric descriptions for node conditions, node allocatable resources, pod phases, and pod status reasons to match the receiver's generated documentation.
- Removed nonexistent metric references such as `k8s.node.capacity`, `k8s.deployment.unavailable`, and `k8s.replicaset.ready`.
- Updated RBAC to match the official receiver example more closely, including status subresources, events, EndpointSlices, and legacy extensions resources, and removed the kubelet-specific `nodes/stats` permission from the cluster receiver role.
- Replaced unsupported `resource_types` configuration with supported per-metric enable/disable configuration.
- Corrected namespace filtering: the receiver supports `namespaces`, and setting it excludes cluster-scoped resources.
- Removed invalid `metadata_exporters: [resource]` usage for static resource attributes and kept the `resource` processor.
- Updated Collector environment variable expansion from `${VAR}` to `${env:VAR}`.
- Updated the Kubelet Stats endpoint example to use `K8S_NODE_NAME` from the Downward API and clarified that Kubelet Stats should run on each node.
- Updated the production filter processor syntax to current OTTL `metric_conditions`.
- Moved `memory_limiter` to the start of the processor pipeline, matching official best-practice guidance.
- Updated internal telemetry metrics configuration to avoid the obsolete `address` field.
- Corrected alert examples for node condition metric names and pod phase values.
- Updated the Collector image tag from `0.93.0` to `0.153.0`, the latest official release found during validation.
- Corrected operational guidance to increase, not reduce, collection intervals when lowering load or memory pressure.

## Review Notes
The receiver's metrics are still marked development-level in the generated metric documentation even though the receiver's metrics signal is beta. Future reviews should re-check metric names and filter processor syntax because both have changed across Collector releases.
