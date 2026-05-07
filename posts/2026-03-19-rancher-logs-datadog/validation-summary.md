# Validation Summary: How to Send Logs to Datadog from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Logging
- Logging operator
- Fluentd
- Datadog
- `kubectl`

## Sources Consulted
- Rancher logging overview: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging
- Rancher logging architecture: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging/logging-architecture
- Logging operator CRD overview: https://kube-logging.dev/docs/configuration/crds/
- Logging operator `Output` and `ClusterOutput` docs: https://kube-logging.dev/5.3/docs/configuration/output/
- Logging operator Datadog output docs: https://kube-logging.dev/5.1/docs/configuration/plugins/outputs/datadog/
- Logging operator secret reference docs: https://kube-logging.dev/4.7/docs/configuration/plugins/outputs/secret/
- Logging operator parser filter docs: https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Logging operator record transformer docs: https://kube-logging.dev/4.7/docs/configuration/plugins/filters/record_transformer/
- Logging operator log routing docs: https://kube-logging.dev/4.7/docs/configuration/log-routing/
- Logging operator Fluentd troubleshooting docs: https://kube-logging.dev/docs/operation/troubleshooting/fluentd/
- Datadog Fluentd integration docs: https://docs.datadoghq.com/integrations/fluentd/
- Datadog log collection endpoints: https://docs.datadoghq.com/logs/log_collection/?tab=host
- Datadog Logs API docs: https://docs.datadoghq.com/api/latest/logs/
- Datadog API and application keys docs: https://docs.datadoghq.com/account_management/api-app-keys/
- Fluentd parser filter docs: https://docs.fluentd.org/filter/parser

## Issues Found
- The article described the Rancher output as Datadog support “via the HTTP output”. I corrected this to the actual Datadog output plugin terminology used by the Logging operator.
- The `ClusterOutput` example used bare integers for `port` and `ssl_port`, but the Logging operator CRD defines those fields as strings. I quoted them and changed `retry_max_interval` to a time-formatted string.
- The parser example used `suppress_parse_error_log`, which is not supported by the current Fluentd parser filter. I replaced it with `emit_invalid_record_to_error: false` and removed the hardcoded `key_name: log` so the operator can use the container runtime default field.
- The flow examples used `dd_tags` as a per-record field. Datadog’s Fluentd guidance uses `ddtags` for log-record metadata, so I corrected the field names while keeping `ddsource` and `service` aligned with Datadog’s reserved attributes.
- Steps 4, 5, and 6 were written as cumulative instructions, which would create multiple cluster-wide flows and duplicate log delivery. I changed Steps 5 and 6 so they explicitly replace the earlier cluster-wide flow instead of stacking on top of it.
- Step 6 used custom `ddsource` values like `kubernetes-app` and `kubernetes-infra`, which are not standard Datadog integration source names. I normalized those flows to `ddsource: "kubernetes"` and kept the routing differences in tags instead.
- The original Step 6 routing also excluded `cattle-logging-system` from the application flow without including it in the infrastructure flow, which would drop those logs. I added that namespace to the infrastructure route.
- The verification command assumed a Fluentd label selector that is not guaranteed across Rancher logging deployments. I replaced it with a more reliable pod-discovery-and-logs sequence.

## Review Notes
- The examples still use static tags such as `cluster:production` and `environment:prod`; in production, those values should usually be templated or customized per cluster.
- Datadog supports multiple site-specific intake endpoints beyond US1 and EU. The article now remains correct for US1 and EU, but users on US3, US5, AP1, AP2, or Fed sites should substitute the endpoint for their Datadog site.
- The review validated syntax and documentation alignment, but it did not run against a live Rancher cluster or a live Datadog account in this workspace.
