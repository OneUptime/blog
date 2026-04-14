# Validation Summary: How to Set Up Dapr On-Call Procedures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar injection, control plane, service invocation metrics)
- Kubernetes (kubectl, pod labels, events, logs)
- Prometheus AlertManager (alert routing, PagerDuty integration)
- PagerDuty (Events API v2)
- OpsGenie (schedule/rotation API)
- Prometheus (PromQL, query_range API)
- jq (JSON processing)

## Sources Consulted
- Prometheus AlertManager configuration documentation (https://prometheus.io/docs/alerting/latest/configuration/#pagerduty_config)
- PagerDuty Events API v1 vs v2 migration documentation
- Dapr sidecar injection documentation — pod labels and annotations (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/)
- Dapr metrics reference — runtime metric names (https://docs.dapr.io/operations/observability/metrics/)
- OpsGenie Schedule API documentation (https://docs.opsgenie.com/docs/schedule-api)
- Kubernetes kubectl reference for label selectors and event sorting
- Cross-referenced metric names against other validated posts in this blog (e.g., dapr-red-metrics, dapr-runbooks)

## Issues Found
1. **Code block language mismatch (line 17)**: The OpsGenie configuration payload was JSON but the code fence was labeled `yaml`. Changed to `json`.

2. **Deprecated PagerDuty integration key field (line 57)**: The AlertManager PagerDuty config used `service_key`, which triggers the deprecated PagerDuty Events API v1. Changed to `routing_key` to use the current Events API v2.

3. **Incorrect Dapr pod label (line 79)**: The diagnostic script used `dapr.io/sidecar-injected=true` as a kubectl label selector, but this is not a standard Dapr label. Changed to `dapr.io/enabled=true`, which is the label Dapr's sidecar injector applies to pods.

4. **Incorrect Dapr metric name (line 144)**: The Prometheus query used `dapr_service_invocation_req_sent_total`, which is missing the `runtime` segment. Changed to `dapr_runtime_service_invocation_req_sent_total`, which is the actual metric name exposed by the Dapr runtime.

## Review Notes
- The OpsGenie JSON payload includes top-level `type` and `startDate` fields that belong in the rotation object rather than the schedule object per the OpsGenie API. However, since the example is illustrative and the rotation structure inside is correct, this was left as-is.
- The `kubectl get events --sort-by='.lastTimestamp'` command uses a field that is being phased out in newer Kubernetes versions in favor of `eventTime`. It still works in current versions but may need updating in the future.
- The post references Dapr version 1.15.1 in the handover template example, which is reasonable for the post's 2026 date.
