# Validation Summary: Troubleshoot Kubernetes API Server Timeout Errors from etcd Latency Spikes

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes API server
- etcd
- kubectl
- etcdctl
- Prometheus metrics and alerting
- Prometheus Operator ServiceMonitor
- Linux disk performance tools
- Cloud block storage

## Sources Consulted
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes system component metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- etcd v3.5 performance guide: https://etcd.io/docs/v3.5/op-guide/performance/
- etcd v3.5 tuning guide: https://etcd.io/docs/v3.5/tuning/
- etcd v3.5 configuration options: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd v3.5 maintenance guide: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd v3.5 monitoring guide: https://etcd.io/docs/v3.5/op-guide/monitoring/

## Issues Found
- The API server metrics example used a pod port-forward to port 8080, which is not a reliable current kube-apiserver metrics access pattern. Changed it to `kubectl get --raw /metrics`, which uses the Kubernetes API path and RBAC.
- The API server latency example showed histogram metrics as if they were direct gauge samples. Replaced it with a Prometheus `histogram_quantile` example over `apiserver_request_duration_seconds_bucket`.
- The introductory explanation claimed every kubectl command, controller reconciliation, and scheduler decision reads or writes etcd. Softened this to reflect API server storage and cache behavior more accurately.
- The manual etcd compaction command used a nested `etcdctl endpoint status` call without the TLS flags required by the surrounding command. Split the revision lookup into a separate TLS-authenticated command and reused the result for compaction.
- The kube-apiserver cache tuning example used `--watch-cache-sizes` to increase cache sizes. Current Kubernetes documentation states that non-zero values are equivalent and only `0` meaningfully disables watch caching for a resource. Replaced this with `--watch-cache=true`.
- The ServiceMonitor snippet used `apiVersion: v1`, which is incorrect for Prometheus Operator ServiceMonitor resources. Changed it to `monitoring.coreos.com/v1`.
- The etcd disk latency alert did not aggregate histogram buckets before `histogram_quantile`. Added `sum by (le)` around the bucket rate expression.
- The API server etcd timeout alert referenced `etcd_request_duration_seconds_count{code="Timeout"}`, but the Kubernetes metric does not have a `code` label. Replaced it with an alert on `etcd_request_errors_total`.

## Review Notes
The guide is technically relevant and generally accurate after the fixes. Some operational recommendations remain environment-specific, such as exact latency thresholds, storage choices, and whether to use a separate etcd cluster for Events. Readers should validate those against their Kubernetes version, managed Kubernetes provider, and production change-management requirements.
