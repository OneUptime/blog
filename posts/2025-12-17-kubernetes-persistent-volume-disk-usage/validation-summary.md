# Validation Summary: How to Monitor Kubernetes Persistent Volume Disk Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes kubelet volume metrics
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Prometheus and PromQL
- Prometheus alerting and recording rules
- kube-state-metrics
- Grafana dashboard queries

## Sources Consulted
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Metrics for Object States / kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics PersistentVolumeClaim metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/persistentvolumeclaim-metrics.md
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators reference: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules reference: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules reference: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The `kube_persistentvolumeclaim_status_phase` examples for pending PVCs and bound-but-not-mounted PVCs did not filter the phase gauge value to `1`. kube-state-metrics exposes phase as a gauge with phase labels, and the official kube-state-metrics examples compare the desired phase to `1` when selecting PVCs in that state. Updated both queries to use `== 1`.

## Review Notes
The kubelet `kubelet_volume_stats_*` metric names and labels used in the post match the Kubernetes metrics reference. The PromQL arithmetic, aggregation, `topk`, `predict_linear`, `and`, `unless`, alert rule, and recording rule examples are syntactically valid for Prometheus. The note that kubelet volume stats are available for mounted PVCs is directionally correct; exact visibility can still depend on the volume plugin or CSI driver support in a given cluster.
