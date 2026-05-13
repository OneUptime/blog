# Validation Summary: HPA Prometheus Metrics with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes custom metrics API
- Prometheus and PromQL
- Prometheus Adapter
- kube-prometheus-stack Helm chart
- Flux CD HelmRelease and Kustomization
- Istio standard metrics
- KEDA Prometheus scaler

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- prometheus-community prometheus-adapter chart page: https://artifacthub.io/packages/helm/prometheus-community/prometheus-adapter
- prometheus-community kube-prometheus-stack chart page: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack/
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/

## Issues Found
- The Prometheus Adapter `metricsQuery` examples returned raw per-series rates. Prometheus Adapter expects one returned value per requested Kubernetes object, so the queries now aggregate with `sum(...) by (<<.GroupBy>>)` and the histogram query aggregates classic histogram buckets by `<<.GroupBy>>` and `le`.
- The Istio metric queries did not filter `reporter`, which can double-count request telemetry when both source and destination proxies report a request. The examples now use `reporter="destination"` for destination-workload scaling.
- The request-rate HPA used `target.type: Value` while the comment described a per-pod target. The example now uses `AverageValue` with `averageValue: "100"` so Kubernetes divides the object metric by the number of pods before comparing it to the target.
- The Flux `dependsOn` example referenced HelmRelease names directly. Flux Kustomization dependencies refer to other Flux Kustomization objects, so the example now points to an `infrastructure` Kustomization that reconciles the monitoring HelmReleases.
- Chart version examples were outdated. The kube-prometheus-stack and prometheus-adapter version constraints were updated to current major versions available from prometheus-community as of this review.

## Review Notes
- The latency HPA example is syntactically valid, but latency-based autoscaling should be tuned carefully because adding pods does not always reduce latency if the bottleneck is downstream.
- The Prometheus Adapter service URL is correct for the default kube-prometheus-stack full name when the HelmRelease is named `kube-prometheus-stack` in the `monitoring` namespace.
