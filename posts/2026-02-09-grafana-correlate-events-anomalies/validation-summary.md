# Validation Summary: How to Build a Grafana Dashboard That Correlates Kubernetes Events

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana dashboards and annotations
- Prometheus and PromQL
- Kubernetes
- kube-state-metrics
- Prometheus Operator PrometheusRule

## Sources Consulted
- Grafana documentation, Annotate visualizations: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Grafana documentation, Prometheus query editor: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Prometheus documentation, Query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation, Operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Kubernetes documentation, kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics documentation, README and CLI arguments: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/README.md and https://github.com/kubernetes/kube-state-metrics/blob/main/docs/developer/cli-arguments.md
- kube-state-metrics documentation, Pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics documentation, Deployment metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- kube-state-metrics documentation, Node metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics documentation, Service metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/service-metrics.md
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post claimed kube-state-metrics exposes Kubernetes Events with `--resources=events` and used `kube_event_unique_events_total` / `kube_event_count`, but those are not documented kube-state-metrics metrics. I changed the setup and examples to use documented kube-state-metrics object-state signals such as pod restarts, OOM termination reason, pending pods, deployment generation changes, node pressure, and service external IP changes.
- The kube-state-metrics deployment pinned `v2.10.1` and configured only the unsupported `events` resource. I updated it to `v2.19.0`, limited `--resources` to the documented resources used by the examples, and corrected the RBAC rules for pods, nodes, services, and deployments.
- The service-change query used `kube_service_spec_external_ips`, but kube-state-metrics documents the singular metric `kube_service_spec_external_ip`. I corrected the metric name.
- The deployment rollout query used `kube_deployment_status_updated_replicas`, but kube-state-metrics documents `kube_deployment_status_replicas_updated`. I corrected the metric name.
- The time-windowed filtering example used range vectors directly with `unless`, but Prometheus logical/set operators are defined between instant vectors. I changed it to compare `increase(...) > 0` instant vectors.
- The Grafana annotation example used a raw `Prometheus` datasource string. I updated it to the current dashboard JSON shape with a Prometheus datasource object and UID placeholder.

## Review Notes
The revised examples are syntactically valid JSON/YAML and use documented kube-state-metrics metric names. The PromQL was reviewed against Prometheus syntax and kube-state-metrics documentation, but not executed against a live Kubernetes/Prometheus/Grafana stack. The post now treats kube-state-metrics metrics as event-like state-change signals; real Kubernetes Event objects still require a separate event exporter or Grafana annotations created from another source.
