# Validation Summary: How to Monitor ArgoCD Repo Server Performance

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Argo CD repo server
- Prometheus and PromQL
- Grafana dashboards
- Kubernetes metrics and kubectl commands
- Kubernetes manifests and ConfigMaps

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- Several PromQL examples used invalid aggregation syntax such as `rate(...) by (...)` or placed `by (...)` after `histogram_quantile(...)`. Updated these to valid PromQL aggregation forms such as `sum by (...) (rate(...))`.
- Histogram percentile queries did not preserve the `le` label required for classic Prometheus histograms. Updated `histogram_quantile` examples to aggregate buckets with `sum by (le)` or `sum by (<label>, le)`.
- The post used `argocd_repo_server_request_duration_seconds` and `argocd_repo_server_request_total`, which are not listed in the official Argo CD repo server metrics. Replaced them with repo server gRPC metrics for `repository.RepoServerService`, including `GenerateManifest`, and noted that gRPC histograms require `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true`.
- Git error examples filtered `argocd_git_request_total` by `grpc_code`, but the official Argo CD Git request metric is documented as a Git request counter, while fetch failures have their own `argocd_git_fetch_fail_total` metric. Updated the failure and error-rate examples to use `argocd_git_fetch_fail_total`.
- The memory-limit alert joined container memory usage to `kube_pod_container_resource_limits` only on `pod`. Updated the join to include `namespace`, `pod`, and `container`, and filtered the limit metric to `resource="memory", unit="byte"`.
- The persistent repo cache snippet declared a PVC-backed `tmp` volume but did not mount it. Added a matching `volumeMounts` example for `/tmp`.
- Normalized the cache expiration example to the official-style Go duration format `24h0m0s`.
- Adjusted wording that implied direct cache-efficiency metrics were covered. The official repo-server metrics include Git, Redis, OCI, and pending repository-lock request metrics, but not a direct cache-hit/cache-miss efficiency metric.

## Review Notes
- `promtool` and `kubectl` were not installed in the local workspace, so PromQL and kubectl examples were reviewed against official documentation rather than executed locally.
- The gRPC `GenerateManifest` queries are useful for manifest-generation latency, but they measure the repo-server RPC method rather than breaking latency down by Helm, Kustomize, Jsonnet, or plain YAML source type.
