# Validation Summary: How to Monitor Calico Node Pod Eviction

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- kube-state-metrics
- Prometheus
- Prometheus Operator
- Node Exporter
- jq

## Sources Consulted
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics Pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The CalicoNodeEvicted alert used `kube_pod_status_phase{phase="Failed"}`, which detects failed pods but does not specifically detect evicted pods. Changed it to `kube_pod_status_reason{reason="Evicted"}` so the alert matches eviction specifically, as documented by kube-state-metrics.
- The diagram label described the alert source as `Failed/Evicted`, which no longer matched the corrected eviction-specific query. Changed it to `Evicted`.
- The conclusion claimed that acting on disk usage alerts before pressure conditions occur prevents calico-node eviction entirely. Changed this to "helps prevent calico-node eviction" because Kubernetes node-pressure eviction can also be triggered by memory, inode, image filesystem, container filesystem, and PID pressure signals.

## Review Notes
- `kube_pod_status_reason` is marked experimental in kube-state-metrics, but it is the documented metric for pod status reasons including `Evicted`.
- The disk usage alert checks only the `/` mountpoint. This can be useful, but Kubernetes DiskPressure can also be caused by image filesystem, container filesystem, or inode thresholds depending on node layout.
