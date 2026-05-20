# Validation Summary: How to Send ArgoCD Metrics to OneUptime

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD Prometheus metrics
- Prometheus remote write
- Prometheus Operator
- OpenTelemetry Collector
- Kubernetes manifests and kubectl log inspection
- OneUptime telemetry ingestion

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Prometheus configuration documentation for `remote_write`, `headers`, and `write_relabel_configs`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote-write 1.0 specification: https://prometheus.io/docs/specs/prw/remote_write_spec/
- Prometheus Operator API reference for `remoteWrite`, `headers`, and `writeRelabelConfigs`: https://prometheus-operator.dev/docs/api-reference/api/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- The OneUptime examples used `x-oneuptime-service-token`. OneUptime's current OpenTelemetry documentation uses `x-oneuptime-token` for telemetry ingestion. Updated the Prometheus remote-write and OTLP exporter examples to use `x-oneuptime-token`.
- The OTLP exporter used `https://oneuptime.com/api/telemetry/metrics/v1/otlp` without the documented JSON encoding settings. Updated it to `https://oneuptime.com/otlp`, added `encoding: json`, and added `Content-Type: application/json` to match OneUptime's collector example.
- The OpenTelemetry scrape target for the application controller used `argocd-application-controller-metrics`. Argo CD documents controller metrics at `argocd-metrics:8082/metrics`. Updated the target to `argocd-metrics.argocd.svc:8082`.
- The OpenTelemetry scrape target for repo-server used `argocd-repo-server-metrics`. Argo CD documents repo-server metrics at `argocd-repo-server:8084/metrics`. Updated the target to `argocd-repo-server.argocd.svc:8084`.
- The dashboard examples used PromQL histogram queries without aggregating buckets by `le`. Updated the Git operation latency and reconciliation duration queries to use `sum(rate(..._bucket[5m])) by (le)`.
- The sync success rate query divided a phase-filtered counter by the unfiltered counter without aggregation, which can fail due to label mismatch. Updated it to aggregate numerator and denominator with `sum(rate(...))`.
- The reconciliation metric examples used undocumented `argocd_app_reconcile_duration_seconds_bucket` and `argocd_app_reconcile_count`. Argo CD documents the reconciliation histogram as `argocd_app_reconcile`, which appears as `argocd_app_reconcile_bucket` in Prometheus. Updated the dashboard and filtering examples.
- The Git operations alert used `argocd_git_request_total{grpc_code!="OK"}`. The current Argo CD repo-server metrics documentation does not document a `grpc_code` label for `argocd_git_request_total`; it does document `argocd_git_fetch_fail_total`. Updated the alert to use `argocd_git_fetch_fail_total`.
- The OneUptime setup step referred to a service token. Updated it to refer to a telemetry ingestion token.

## Review Notes
- The YAML snippets were parsed successfully with PyYAML after edits.
- `kubectl` is not installed in this local environment, so I could not check `kubectl logs --help` locally. The `kubectl logs -n <namespace> deployment/<name> --tail=50` form is consistent with Kubernetes CLI usage.
- The post uses `otel/opentelemetry-collector-contrib:latest`, which is syntactically valid but should be pinned to a tested version in production.
