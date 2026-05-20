# Validation Summary: How to Monitor Shard Assignment in ArgoCD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD application controller sharding
- Kubernetes cluster secrets, StatefulSets, pods, and kubectl
- Prometheus and PromQL
- Grafana dashboard panels
- Prometheus Operator PrometheusRule alerts

## Sources Consulted
- Argo CD High Availability / application controller sharding: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Dynamic Cluster Distribution: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD application controller metrics source: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics.go
- Argo CD cluster collector metrics source: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/clustercollector.go
- Argo CD application controller queue source: https://github.com/argoproj/argo-cd/blob/master/controller/appcontroller.go
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post described shard assignment as an `argocd.argoproj.io/shard` annotation on cluster secrets. Argo CD documents manual shard assignment as the cluster secret `shard` data field, so the cluster-secret commands were updated to read and base64-decode `.data.shard`, using `auto` when no explicit shard is stored.
- The distribution-balance command counted a non-existent shard annotation. It now counts decoded explicit `shard` data values and distinguishes automatic runtime assignment from manual assignment.
- The PromQL examples used labels or metrics that are not documented for current Argo CD, including `argocd_app_reconcile_count{result="error"}`, `argocd_cluster_info` with `connection_status`, `argocd_cluster_info` grouped by `shard`, and `argocd_cluster_api_request_total`. These were replaced with documented metrics: `argocd_app_k8s_request_total`, `argocd_cluster_connection_status`, and `argocd_cluster_info` grouped by scrape `pod`.
- The workqueue queue-duration example referenced the histogram family without querying buckets. It now uses `workqueue_queue_duration_seconds_bucket` with `histogram_quantile`.
- The log-grep example looked for `Processing cluster`, which is not a stable controller log string in current Argo CD source. It now searches for broader cluster and reconciliation messages that match current controller log output more realistically.
- The troubleshooting command for finding a cluster's shard was updated from the non-existent annotation path to `.data.shard | base64 -d`.

## Review Notes
The PromQL examples rely on the Prometheus scrape configuration adding a `pod` label to Argo CD application controller metrics. That is common in Kubernetes service discovery, but some installations may expose the same distinction with another target label such as `instance` or `hostname`.
