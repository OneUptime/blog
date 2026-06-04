# Validation Summary: How to Monitor Autoscaler Decisions with Kubernetes Events and Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes Events
- kubectl
- kubernetes-event-exporter
- Loki
- Prometheus and PromQL
- kube-state-metrics
- Grafana dashboards
- Prometheus alerting rules
- Cluster Autoscaler
- Vertical Pod Autoscaler
- Python Kubernetes client

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough and status conditions: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough
- Kubernetes Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes kube-apiserver reference for `--event-ttl`: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- kube-state-metrics HPA metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- Prometheus PromQL function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- kubernetes-event-exporter README: https://github.com/resmoio/kubernetes-event-exporter
- Cluster Autoscaler FAQ and metrics notes: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler metrics proposal: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/proposals/metrics.md
- Vertical Pod Autoscaler API reference: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- prometheus-community kube-state-metrics Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-state-metrics/values.yaml

## Issues Found
- The event exporter section claimed Kubernetes events could be exported to Prometheus by sending webhook output to Pushgateway. kubernetes-event-exporter sends structured events to sinks such as Loki, Elasticsearch, webhooks, and other receivers; Pushgateway expects Prometheus text exposition metrics. Changed the section to export events to Loki for long-term storage and corrected the receiver configuration.
- The kubernetes-event-exporter route used `involvedObject.kind`, which is not the documented route match field. Changed it to `kind: HorizontalPodAutoscaler`.
- The kube-state-metrics Helm install command used `prometheus.monitor.enabled=true` but did not create the namespace. Added `--create-namespace` so the example works when the `monitoring` namespace does not already exist.
- The Grafana CPU query used `avg(...) / avg(...)`, omitted the CPU request unit label, and multiplied the HPA target metric by 100. Changed the current CPU query to use `sum(rate(...)) / sum(kube_pod_container_resource_requests{unit="core"}) * 100` and removed the extra multiplier from the HPA utilization target metric.
- The dashboard and alert examples used `increase()` or `rate()` on `kube_horizontalpodautoscaler_status_current_replicas`, which is a gauge. Replaced these with `changes()` for replica count change detection.
- The alert example filtered `kube_horizontalpodautoscaler_status_condition` by a `reason` label and referenced `$labels.metric_name`; kube-state-metrics documents only `horizontalpodautoscaler`, `namespace`, `condition`, and `status` for this metric. Removed unsupported labels and renamed the alert to `HPAUnableToScale`.
- The best-practices query referenced `kube_horizontalpodautoscaler_status_last_scale_time`, which is not exposed by kube-state-metrics. Replaced it with a replica convergence query comparing desired and current replicas.

## Review Notes
`kubectl` was not installed in the review environment, so kubectl command validation was performed against Kubernetes API and command documentation rather than local `kubectl --help` output. The VPA exporter example is suitable as a simplified example, but a production exporter should use a full Kubernetes quantity parser to support every valid CPU and memory suffix.
