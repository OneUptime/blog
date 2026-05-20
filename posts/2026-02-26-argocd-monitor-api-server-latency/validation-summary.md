# Validation Summary: How to Monitor ArgoCD API Server Latency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus and PromQL
- gRPC metrics
- Redis-backed Argo CD caching

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD command parameter ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Prometheus `histogram_quantile()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus alerting and recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- go-grpc-prometheus metrics documentation: https://github.com/grpc-ecosystem/go-grpc-prometheus
- gRPC status code documentation: https://grpc.io/docs/guides/status-codes/
- Kubernetes API health endpoint documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used `http_request_duration_seconds_bucket` and `http_request_duration_seconds_count` for Argo CD API server latency and request rate. Argo CD's documented API server metrics do not expose those generic HTTP request duration metrics for normal API paths, so the examples were changed to the documented gRPC metrics, including `grpc_server_handling_seconds_bucket` and `grpc_server_handled_total`.
- Several PromQL histogram queries placed `by (...)` after `histogram_quantile(...)`, which is not valid for classic histogram aggregation. The queries were corrected to aggregate bucket rates with `sum by (le, ...)` inside `histogram_quantile()`.
- The post described tracking slow REST paths with built-in Argo CD metrics. Argo CD's built-in API server metrics identify gRPC service and method, not REST path, so the wording and examples were changed to gRPC service/method tracking.
- Error-rate queries used HTTP `5xx` status code matching. These were changed to gRPC status-code matching for server-side failure codes such as `Unknown`, `DeadlineExceeded`, `Internal`, `Unavailable`, and `DataLoss`.
- The Kubernetes API health check used `/healthz`, which Kubernetes documents as deprecated since v1.16. It was changed to `/readyz`.
- The Redis diagnostic metric used `redis_commands_duration_seconds_total`, which is not the Argo CD API server Redis latency histogram. It was changed to `argocd_redis_request_duration_seconds_bucket` with `initiator="argocd-server"`.
- The "Enable response caching" heading implied a configuration change that the snippet did not perform. It was changed to "Ensure Redis cache capacity" to match the actual recommendation.

## Review Notes
The gRPC latency histogram requires `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true`, which is now called out explicitly. The remaining latency threshold values are operational starting points rather than official Argo CD SLOs and should be tuned per installation.
