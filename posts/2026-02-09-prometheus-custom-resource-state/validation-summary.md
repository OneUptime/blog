# Validation Summary: How to Implement Prometheus Custom Resource State Metrics for CRD Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Kubernetes CustomResourceDefinitions
- kube-state-metrics custom resource state metrics
- Kubernetes RBAC
- PromQL
- Argo CD Application CRDs

## Sources Consulted
- kube-state-metrics Custom Resource State Metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md
- kube-state-metrics v2.10.1 Custom Resource State Metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/v2.10.1/docs/customresourcestate-metrics.md
- kube-state-metrics customresourcestate Go package reference: https://pkg.go.dev/k8s.io/kube-state-metrics/v2/pkg/customresourcestate
- kube-state-metrics releases: https://github.com/kubernetes/kube-state-metrics/releases
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The deployment used the old kube-state-metrics `v2.10.1` image. Updated it to the current `v2.19.0` release.
- The examples claimed metrics such as `kube_application_info`, but kube-state-metrics defaults custom resource metrics to a `kube_customresource_*` prefix. Added `metricNamePrefix: kube` where needed so the generated metric names match the article's PromQL examples.
- Several scalar Gauge and StateSet examples placed `namespace` and `name` under metric-level `labelsFromPath`, where paths are evaluated relative to the metric path. Moved those labels to resource-level `labelsFromPath` so they are read from Kubernetes metadata.
- StateSet examples omitted `labelName`, which is required to name the label containing the state value. Added explicit `labelName` fields for phase, Argo CD sync status, and Argo CD health status.
- The status condition example incorrectly implied a `status` label and had metadata labels in the wrong path context. Updated it to use the condition's `status` as the Gauge value and query `type="Ready"` directly.
- The label selector / field selector section used unsupported per-resource `namespaces` and `labelSelector` fields. Reworked it to show label extraction for Prometheus-side filtering.
- The performance section used unsupported per-resource namespace and label selector fields. Replaced it with a valid minimal metrics configuration and noted that namespace limiting is done with kube-state-metrics deployment flags.
- The RBAC example omitted the documented requirement to list and watch `customresourcedefinitions.apiextensions.k8s.io`. Added that permission.
- The nested memory metric used `valueFrom` incorrectly with a scalar path. Removed `valueFrom` and clarified that Kubernetes quantity strings are converted automatically.
- The Prometheus alert example used old inline `ALERT ... IF ...` syntax in a PromQL block. Replaced it with the alert expression itself.

## Review Notes
The post is technically relevant and now aligns with the official kube-state-metrics custom resource state metric schema. Future improvements could include a complete Prometheus rule YAML example and a note that kube-state-metrics also adds reserved `customresource_group`, `customresource_version`, and `customresource_kind` labels to custom resource state metrics.
