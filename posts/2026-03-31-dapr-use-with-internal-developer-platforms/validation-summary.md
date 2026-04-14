# Validation Summary: How to Use Dapr with Internal Developer Platforms

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, component model, annotations, metrics)
- Port (Internal Developer Platform by getport.io)
- GitHub Actions (workflow_dispatch, CI/CD)
- Kubernetes (namespaces, pod annotations, kubectl)
- Helm (chart templating)
- Prometheus (PromQL queries, Dapr metric scraping)
- Grafana (metrics display)
- Jaeger / Zipkin (distributed tracing)
- Argo CD (GitOps)
- jq (JSON processing)

## Sources Consulted
- Dapr metrics reference and HTTP monitoring source code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/http_monitoring.go
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Kubernetes annotations documentation: https://docs.dapr.io/reference/arguments-annotations-overview/
- Port blueprint setup documentation: https://docs.port.io/build-your-software-catalog/define-your-data-model/setup-blueprint/
- Port relations documentation: https://docs.port.io/build-your-software-catalog/define-your-data-model/relate-blueprints/
- Port GitHub workflow backend: https://docs.port.io/actions-and-automations/setup-backend/github-workflow/
- Port self-service actions RBAC (requiredApproval): https://docs.port.io/actions-and-automations/create-self-service-experiences/set-self-service-actions-rbac/
- GitHub Actions workflow_dispatch documentation: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch

## Issues Found
1. **Incorrect metric name for error rate query**: The Prometheus query for `dapr_error_rate` used `dapr_http_server_response_count`, which is a legacy/deprecated Dapr metric only available when legacy metrics mode is enabled. Changed to `dapr_http_server_request_count`, which is the current standard metric that tracks HTTP requests including their response status codes via the `status` label.

2. **Incorrect label name in error rate query**: The query used `status_code` as the label name for filtering HTTP status codes. Dapr metrics use `status` as the label name, not `status_code`. Changed `status_code=~"5.*"` to `status=~"5.*"`.

## Review Notes
- The Port blueprint and self-service action JSON structures are correct and match official Port documentation.
- Dapr Kubernetes annotations (`dapr.io/enabled`, `dapr.io/config`, `dapr.io/log-level`) are all valid and correctly referenced.
- The GitHub Actions workflow syntax is correct, including the `workflow_dispatch` trigger with `choice` type inputs.
- The jq script for standards enforcement is syntactically correct and logically sound.
- The `dapr_http_server_request_count` request rate query was already correct before the fix; only the error rate query needed correction.
