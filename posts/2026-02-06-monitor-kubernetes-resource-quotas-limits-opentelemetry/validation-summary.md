# Validation Summary: How to Monitor Kubernetes Resource Quotas and Limits with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota, LimitRange, requests, and limits
- OpenTelemetry Collector
- OpenTelemetry `k8s_cluster` receiver
- OpenTelemetry `kubelet_stats` receiver
- OpenTelemetry transform processor / OTTL
- Kubernetes Python client
- OpenTelemetry Python metrics SDK
- Kubernetes RBAC

## Sources Consulted
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Contrib `k8sclusterreceiver` documentation and metadata: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8sclusterreceiver and https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8sclusterreceiver
- OpenTelemetry Collector Contrib `kubeletstatsreceiver` documentation and metadata: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kubeletstatsreceiver and https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kubeletstatsreceiver
- OpenTelemetry transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Quantity definition: https://kubernetes.io/docs/reference/kubernetes-api/definitions/quantity-resource/
- OpenTelemetry Python metrics documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- Kubernetes Python client documentation: https://github.com/kubernetes-client/python

## Issues Found
- The original Collector example combined `k8s_cluster` and kubelet metrics in one Deployment. Official OpenTelemetry guidance says only one `k8s_cluster` receiver instance is needed per cluster, while kubelet scraping should generally run as a DaemonSet to cover every node. Updated the text and configuration to separate cluster-level metrics from kubelet usage metrics.
- The `kubeletstats` receiver name was outdated. The current receiver type is `kubelet_stats`, with `kubeletstats` retained as a deprecated type. Updated references and examples to `kubelet_stats`.
- The `allocatable_types_to_report` example used `storage`, which is not one of the documented values. Changed it to `ephemeral-storage`.
- The kubelet metrics configuration tried to enable `k8s.container.cpu_request`, `k8s.container.cpu_limit`, `k8s.container.memory_request`, and `k8s.container.memory_limit` on the kubelet receiver. Those request/limit metrics are emitted by `k8s_cluster`; kubelet request/limit utilization metrics use names such as `k8s.container.cpu_limit_utilization`. Updated the example accordingly.
- The RBAC example omitted `nodes/pods`, which is required by the kubelet receiver when using `extra_metadata_labels` or request/limit utilization metrics. Added the permission and removed the unnecessary `nodes/proxy` resource from that rule.
- The post said the transform processor could calculate quota utilization from raw receiver output. The raw quota values are emitted as separate `k8s.resource_quota.used` and `k8s.resource_quota.hard_limit` metrics, so a simple datapoint transform cannot divide them directly. Updated the explanation to recommend backend queries or a custom exporter, and changed the transform example to tag an already computed utilization metric.
- The custom Kubernetes quantity parser only handled a few suffixes and would fail or misread valid Kubernetes quantities. Replaced it with the official Kubernetes Python client's `parse_quantity` helper and converted values to floats before recording metrics.
- The capacity planning examples used non-existent metric names such as `k8s.node.allocatable` and `k8s.pod.cpu.request`. Updated them to documented `k8s.node.allocatable_cpu` and `k8s.container.cpu_request` names.

## Review Notes
The custom Python exporter examples remain illustrative and would still need normal production hardening, such as error handling, graceful shutdown, and avoiding duplicate instrument creation if the LimitRange and missing-limit helpers are called repeatedly. The corrected metric names and Collector configuration now align with current OpenTelemetry Collector Contrib documentation.
