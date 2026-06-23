# Validation Summary: How to Fix HPA Not Fetching Custom Metrics

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes Custom Metrics API
- Kubernetes External Metrics API
- Prometheus
- Prometheus Adapter
- Helm
- PromQL
- kube-state-metrics alerting metrics

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concept documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Custom Metrics v1beta2 API reference: https://kubernetes.io/docs/reference/external-api/custom-metrics.v1beta2/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter external metrics documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/externalmetrics.md
- prometheus-community Prometheus Adapter Helm chart values and templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The Helm install command used `--namespace monitoring` without creating the namespace. Added `--create-namespace` so the command works on a fresh cluster.
- The adapter service connectivity test used `http://...:443`, but the chart registers the APIService against the adapter's HTTPS service. Changed the probe to use `https://` with `wget --no-check-certificate`.
- The external RabbitMQ metric example mapped the Prometheus `queue` label to a Kubernetes `queue` resource, which is not valid unless the cluster has a matching resource type. Changed the rule to `resources.namespaced: false` and aggregated by the `queue` label, matching Prometheus Adapter's external metrics behavior for non-Kubernetes queue metrics.

## Review Notes
The post uses `custom.metrics.k8s.io/v1beta1`, which is still the APIService version emitted by the current prometheus-community Prometheus Adapter chart. Kubernetes' external API reference also documents Custom Metrics v1beta2, so readers using a different adapter should verify the served API version with `kubectl get apiservice`. Local `kubectl` and `helm` binaries were not installed in the review environment, so CLI behavior was verified against official documentation and upstream chart templates rather than local `--help` output.
