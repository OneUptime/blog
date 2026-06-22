# Validation Summary: How to Monitor Kubernetes etcd Health and Performance

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Kubernetes
- kubeadm static Pods
- etcd and etcdctl
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards
- Google Kubernetes Engine
- Amazon EKS

## Sources Consulted
- etcd v3.5 configuration options: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd monitoring guide: https://etcd.io/docs/v3.4/op-guide/monitoring/
- etcd v3.5 metrics reference: https://etcd.io/docs/v3.5/metrics/etcd-metrics-latest.txt
- etcd maintenance guide: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd cluster status tutorial: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- GKE scalability troubleshooting: https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/scalability
- GKE control plane metrics documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/control-plane-metrics
- Amazon EKS control plane monitoring best practices: https://docs.aws.amazon.com/eks/latest/best-practices/control_plane_monitoring.html
- Cloud Monitoring metric descriptor filter documentation: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/list
- Grafana panel and unit documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/

## Issues Found
- The kubeadm etcd manifest used `grpc_server_handling_seconds_bucket` later in the post but did not enable `--metrics=extensive`, which etcd requires for server-side gRPC histogram metrics. Added `--metrics=extensive`.
- The GKE example claimed direct etcd metrics were available under a non-general Anthos-style Cloud Monitoring prefix and used an invalid Monitoring filter shape. Replaced it with the documented GKE `ETCD_DB_USAGE_APPROACHING_LIMIT` Recommender query for managed control planes.
- The static etcd scraping example used the deprecated Kubernetes `Endpoints` API. Replaced it with `discovery.k8s.io/v1` `EndpointSlice` and added the required Service association label and a manual management label.
- The static Prometheus scrape configuration set `scheme: https` even though the example etcd metrics listener was configured as plain HTTP. Changed the active scheme to `http` and left HTTPS/TLS as commented optional configuration.
- The database quota alert expressions multiplied the ratio by 100 while the annotations used `humanizePercentage`, which expects a 0-1 ratio. Changed thresholds to ratio values (`0.8` and `0.95`).
- The compaction and defragmentation commands omitted the endpoint and TLS flags used elsewhere in the post. Added consistent `--endpoints`, `--cacert`, `--cert`, and `--key` flags.

## Review Notes
- The dashboard's `etcd_debugging_mvcc_keys_total` panel uses an etcd debugging metric. This metric is useful operationally, but etcd documentation treats debugging metrics as less stable than core metrics.
- Several alert thresholds are reasonable examples, not universal SLOs. Operators should tune them for cluster size, storage hardware, and API-server workload.
