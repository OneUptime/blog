# Validation Summary: How to Monitor ArgoCD Git Operations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD repo-server metrics
- GitOps and Git repository operations
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Grafana dashboards
- Kubernetes `kubectl`
- Argo CD CLI

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD repo-server metrics source: https://github.com/argoproj/argo-cd/blob/master/reposerver/metrics/metrics.go
- Argo CD repo-server implementation source: https://github.com/argoproj/argo-cd/blob/master/reposerver/repository/repository.go
- Prometheus `histogram_quantile`, `rate`, and aggregation documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Argo CD `argocd repo list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_list/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post claimed `argocd_git_request_total` had a `grpc_code` label and used it for error-rate queries. Argo CD repo-server Git request metrics are labeled by `repo` and `request_type`; fetch failures are exposed via `argocd_git_fetch_fail_total`. I replaced the `grpc_code` queries with fetch failure queries.
- Several PromQL examples used invalid aggregation syntax such as `rate(...[5m]) by (request_type)` and `histogram_quantile(...) by (request_type)`. I changed these to valid `sum by (...) (rate(...))` forms.
- Histogram quantile examples did not aggregate classic histogram buckets with the required `le` label. I updated P50/P95/P99 examples, alerts, and recording rules to use `sum by (le)` or `sum by (le, request_type)`.
- The post said `checkout` was a value of the Git request metric `request_type`. Current Argo CD repo-server Git request metrics use `ls-remote` and `fetch`; I clarified that checkout is a Git operation but not a separate metric request type.
- The opening paragraph said every reconciliation cycle starts with a Git fetch. I corrected this to say reconciliation resolves Git revisions and may fetch when the required revision is not already cached.
- The no-requests alert would not fire when the metric series was absent. I updated it to use `or vector(0)` so absent data is treated as zero.

## Review Notes
The `argocd_git_fetch_fail_total` metric measures fetch failures, not every possible Git-related failure. Authentication, rate limiting, and checkout issues should still be investigated in repo-server logs alongside the metrics.
