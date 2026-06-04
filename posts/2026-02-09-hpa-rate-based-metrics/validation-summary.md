# Validation Summary: How to Implement HPA with Rate-Based Metrics for Request Scaling

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler autoscaling/v2
- Kubernetes custom metrics API
- Prometheus and PromQL rate/histogram functions
- Prometheus Adapter
- Prometheus Go client library
- kubectl
- jq

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Go application instrumentation guide: https://prometheus.io/docs/guides/go-application/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md

## Issues Found
- The introduction and conclusion overclaimed that request-rate scaling maintains performance regardless of individual request cost. This is not accurate because raw request rate does not account for changes in CPU cost or latency by itself. Updated the wording to explain that rate targets work best when per-request cost is understood and should be combined with resource or latency metrics.
- The Prometheus Adapter rules relied on `namespace` and `pod` labels, but the deployment example did not state that the scrape configuration must attach those labels. Added a note that Prometheus Kubernetes scraping or relabeling must provide those labels so the adapter can map series back to Pods.
- The HPA example that used `http_request_duration_p95_seconds` referenced a custom metric that had not been exposed by an adapter rule. Added a Prometheus Adapter rule using `histogram_quantile(0.95, sum(rate(...)) by (pod, le))` through the adapter template placeholders.
- Several abbreviated HPA examples omitted `scaleTargetRef.apiVersion`. Kubernetes marks `kind` and `name` as required and `apiVersion` as optional, but adding `apps/v1` makes the Deployment target references complete and unambiguous for readers applying the examples.

## Review Notes
The examples assume a Prometheus setup that supports annotation-based scraping or equivalent Kubernetes service discovery. The `custom.metrics.k8s.io/v1beta1` raw API paths are still commonly used by Prometheus Adapter examples even though the API group remains beta-named.
