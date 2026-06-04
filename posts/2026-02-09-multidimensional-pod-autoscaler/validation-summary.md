# Validation Summary: How to Use Multidimensional Pod Autoscaler for Combined CPU and Memory Scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- KEDA ScaledObject
- KEDA CPU, memory, and Prometheus scalers
- Prometheus and PromQL
- Kubernetes Custom Metrics API
- Prometheus Adapter
- Helm
- kubectl

## Sources Consulted
- Kubernetes HPA concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Custom Metrics API v1beta2 reference: https://kubernetes.io/docs/reference/external-api/custom-metrics.v1beta2/
- Kubernetes resource metrics pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA scaling deployments concepts: https://keda.sh/docs/2.19/concepts/scaling-deployments/
- KEDA CPU scaler documentation: https://keda.sh/docs/latest/scalers/cpu/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.15/scalers/prometheus/
- KEDA Prometheus integration metrics: https://keda.sh/docs/latest/integrations/prometheus/
- KEDA Helm chart values: https://github.com/kedacore/charts/blob/main/keda/values.yaml
- Prometheus aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions: https://prometheus.io/docs/prometheus/3.9/querying/functions/
- Kubernetes SIGs Prometheus Adapter: https://github.com/kubernetes-sigs/prometheus-adapter

## Issues Found
- The post described "Multidimensional Pod Autoscaler (MPA)" as part of KEDA and as an enhanced HPA strategy. I changed this to describe the actual mechanisms: KEDA feeds metrics to HPA and can use composite metrics from Prometheus queries or KEDA scaling modifiers.
- The HPA example claimed HPA v2 supports multiple metric combination strategies via `metricType`. I corrected this: HPA calculates desired replicas for each metric and chooses the maximum; `behavior` controls scaling rate and stabilization.
- The caching-service scenario mixed CPU-only behavior with HPA max logic. I changed the scenario to explicitly describe an HPA that only tracks CPU.
- The Prometheus scaler queries could return multiple time series and used resource limits with unsafe pod-level joins. I changed them to aggregate per pod, normalize against Kubernetes resource requests, and return a single composite value for KEDA's Prometheus scaler.
- The custom metrics adapter Python example was not a working Kubernetes custom metrics adapter: it had undefined methods, used the older `custom.metrics.k8s.io/v1beta1` response shape, and a standalone HTTP service would not be consumed by HPA. I replaced it with a Prometheus Adapter rule pattern and noted that HPA needs an aggregated Custom Metrics API.
- The monitoring alert used `keda_scaledobject_scaling_total`, which is not listed in current KEDA metrics. I changed it to use `changes(kube_deployment_status_replicas[10m])` for frequent replica changes.
- The `kubectl describe scaledobject` and event commands omitted the namespace even though the examples deploy into `production`. I added `-n production`.

## Review Notes
The KEDA CPU and memory scaler snippets are valid but require Metrics Server and resource requests or defaults to be configured for the target pods. The Prometheus examples assume kube-state-metrics-style `kube_pod_container_resource_requests` metrics and container metrics with `namespace`, `pod`, `container`, and `image` labels.
