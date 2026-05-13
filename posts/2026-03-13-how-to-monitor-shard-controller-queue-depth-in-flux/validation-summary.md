# Validation Summary: How to Monitor Shard Controller Queue Depth in Flux

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Flux
- Kubernetes
- Flux controller sharding
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards
- kubectl

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux kustomize-controller options documentation: https://fluxcd.io/flux/components/kustomize/options/
- controller-runtime metrics package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/metrics
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl port-forward documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The shard examples used names such as `kustomize-controller-shard-1`, while Flux's sharding documentation uses generated shard names such as `kustomize-controller-shard1`. Updated the deployment, Service selectors, and port-forward command to use the Flux-style shard naming.
- The shard Service selectors assumed labels that were not shown on the deployment example. Added matching `app` labels and selector fields to the Kustomize patch example so the Services can select the shard Pods.
- The p99 reconciliation duration queries passed raw classic histogram buckets directly to `histogram_quantile`. Updated the PromQL to aggregate with `sum by (pod, controller, le)` before calculating the quantile, matching Prometheus guidance for grouped classic histogram queries.
- The average queue wait time query divided raw `_sum` and `_count` rates without grouping. Updated it to aggregate both sides with `sum by (pod, name)` so the result is computed per shard/workqueue.
- The shard-specific dashboard and alert examples were not consistently filtered to shard Pods. Updated the relevant PromQL selectors to use `pod=~".*shard.*"`.

## Review Notes
The post is technically valid after the fixes. Flux's official monitoring example uses PodMonitor, while this post uses ServiceMonitor plus per-shard Services; that is a valid Prometheus Operator pattern as long as the Services' selectors match the shard Pods and the Prometheus instance is configured to select the ServiceMonitor.
