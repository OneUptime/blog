# Validation Summary: How to Use Dapr with GitOps and Progressive Delivery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- GitOps
- Argo CD
- Flux (Fluxcd)
- Argo Rollouts (Progressive Delivery)
- Kubernetes
- Kustomize
- Prometheus

## Sources Consulted
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr HTTP monitoring source code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/http_monitoring.go
- Argo CD documentation: https://argo-cd.readthedocs.io/en/stable/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization spec: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Argo Rollouts analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts canary strategy: https://argo-rollouts.readthedocs.io/en/stable/features/canary/

## Issues Found
1. **Incorrect Dapr Prometheus metric name**: The AnalysisTemplate Prometheus query used `dapr_http_server_response_count`, which is not the standard documented Dapr metric. Changed to `dapr_http_server_request_count`, which is the correct metric that includes HTTP status codes as labels.
2. **Incorrect metric label name**: The query used `status_code` as the label for HTTP status codes. In Dapr's Prometheus metrics, the correct label is `status`. Changed `status_code=~"5.*"` to `status=~"5.."`.
3. **Imprecise regex for 5xx matching**: Changed `"5.*"` to `"5.."` for more precise matching of exactly 3-character HTTP 5xx status codes (e.g., 500, 502, 503), avoiding unintended matches.

## Review Notes
- The `setWeight: 100` final step in the Argo Rollouts canary strategy is redundant (the rollout automatically promotes to 100% after all steps complete), but it is not technically incorrect and can serve as documentation of intent.
- The Flux Kustomization `healthChecks` on Dapr `Component` resources requires the Dapr CRD to implement kstatus-compatible status conditions. If Dapr Components do not report standard status conditions, the health check may not work as expected. Users may need to use `spec.healthCheckExprs` with CEL expressions for custom health evaluation.
- The Argo Rollouts background `analysis.startingStep: 1` uses zero-based indexing, meaning analysis starts at the second step (the first pause). This is reasonable behavior for this use case.
- All other YAML configurations (Argo CD Application, Flux Kustomization v1 API, Argo Rollouts Rollout spec, Dapr annotations) are correct and use current, non-deprecated APIs.
