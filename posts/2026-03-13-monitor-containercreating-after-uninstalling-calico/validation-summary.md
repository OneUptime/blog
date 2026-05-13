# Validation Summary: How to Monitor ContainerCreating After Uninstalling Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Calico CNI
- kube-state-metrics
- Prometheus Operator PrometheusRule
- PromQL
- kubectl
- jq

## Sources Consulted
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Node status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction described ContainerCreating counts as visibility into pod scheduling. ContainerCreating is a container waiting reason after Kubernetes has accepted the pod, and CNI problems usually affect sandbox/network setup rather than scheduling itself. Updated the wording to refer to pod sandbox and network setup.
- The introduction called a rising ContainerCreating count a direct sign that CNI is broken. Kubernetes pods can remain Pending or show waiting reasons for other setup problems, so the wording now says it is a strong signal to investigate CNI during Calico removal.
- The symptoms referenced pod scheduling failures and "CNI not initialized" node conditions. Updated these to pod startup/network setup failures and the official NetworkUnavailable=true node condition.
- The Root Causes section listed missing monitoring and missing alerts as root causes. Those are monitoring gaps, not technical causes of pods being stuck. Updated the bullets to actual CNI-related causes.
- The PrometheusRule alert was named for ContainerCreating but queried `kube_pod_status_phase{phase="Pending"}`. Updated it to use `kube_pod_container_status_waiting_reason{reason="ContainerCreating"}` from kube-state-metrics, which matches the alert name and post topic.
- The conclusion described tracking pod phase metrics and pending pod counts. Updated it to describe tracking container waiting reasons and ContainerCreating counts.

## Review Notes
The shell commands are syntactically valid, but `grep`-based checks are best used as quick operational checks. For durable monitoring, the corrected Prometheus alert depends on kube-state-metrics exposing `kube_pod_container_status_waiting_reason`.
