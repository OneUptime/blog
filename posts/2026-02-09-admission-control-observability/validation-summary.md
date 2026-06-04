# Validation Summary: How to Build Admission Control Observability with Metrics and Audit Logging

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes admission control
- Kubernetes audit logging
- Kyverno
- OPA Gatekeeper
- Prometheus and Prometheus Operator ServiceMonitor/PrometheusRule resources
- Grafana dashboards
- Fluent Bit and Elasticsearch
- Go structured logging with Zap
- Kubernetes dynamic client and PolicyReport resources
- OpenTelemetry tracing
- Kyverno pprof profiling

## Sources Consulted
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/
- Kyverno monitoring guide: https://kyverno.io/docs/monitoring/
- Kyverno Policy Reports documentation: https://kyverno.io/docs/policy-reports/
- Kyverno configuration and profiling flags: https://kyverno.io/docs/installation/customization/
- Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper runtime flags documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Fluent Bit Grep filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/grep
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch

## Issues Found
- Kyverno policy result queries used `kyverno_policy_results_total{status="fail"}`. Updated them to use the documented `kyverno_policy_results` metric and `rule_result` label.
- Kyverno admission latency examples used `kyverno_http_requests_duration_seconds_bucket` and did not aggregate histogram buckets correctly. Updated latency queries to use `kyverno_admission_review_duration_seconds_bucket` with `sum(... ) by (le)`.
- The Gatekeeper webhook request metric was listed as `gatekeeper_webhook_request_total`. Updated it to the documented `gatekeeper_validation_request_count`.
- The API server webhook timeout queries filtered `apiserver_admission_webhook_admission_duration_seconds_count` with `type="timeout"`, but that metric's `type` label is admission type, not timeout status. Updated the dashboard and alert to use `apiserver_admission_webhook_rejection_count` with `error_type="calling_webhook_error"`.
- The Fluent Bit grep filter used `objectRef.apiVersion` as a flat key. Updated it to use Fluent Bit record accessor syntax for the nested audit event field.
- The Elasticsearch output included a mapping type without suppressing type names. Added `Suppress_Type_Name On` for compatibility with modern Elasticsearch behavior.
- The Grafana bar panel type used `bar`. Updated it to `barchart`.
- The Go snippets were missing imports needed by the shown code, and the OpenTelemetry example imported an unused package. Added the missing `time` and `schema` imports and removed the unused `trace` import.
- The Kyverno profiling command patched the deployment's `args` list in a way that would replace existing arguments. Updated it to a JSON patch that appends `--profile=true` to the admission controller deployment.

## Review Notes
- The dashboard JSON remains illustrative rather than a complete import-ready Grafana dashboard because it omits fields such as datasource and layout metadata.
- Kyverno's OpenReports support is alpha as of current documentation; the existing PolicyReport example still uses the default `wgpolicyk8s.io/v1alpha2` API.
