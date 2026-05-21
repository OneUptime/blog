# Validation Summary: How to Send Istio Access Logs to Splunk

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio Telemetry API and Envoy access logs
- Splunk OpenTelemetry Collector for Kubernetes
- Splunk HTTP Event Collector (HEC)
- Fluent Bit
- Splunk Connect for Kubernetes
- Splunk SPL searches and alerts

## Sources Consulted
- Splunk OpenTelemetry Collector for Kubernetes Helm install documentation: https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-for-kubernetes/install-with-helm
- Splunk OpenTelemetry Collector Helm chart values: https://github.com/signalfx/splunk-otel-collector-chart/blob/main/helm-charts/splunk-otel-collector/values.yaml
- Splunk OpenTelemetry Collector advanced Kubernetes configuration: https://github.com/signalfx/splunk-otel-collector-chart/blob/main/docs/advanced-configuration.md
- Fluent Bit 3.0 Splunk output documentation: https://docs.fluentbit.io/manual/3.0/pipeline/outputs/splunk
- Fluent Bit Kubernetes CRI parser documentation: https://docs.fluentbit.io/manual/2.0/installation/kubernetes
- Istio Envoy access log documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig / EnvoyFileAccessLogProvider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Splunk Connect for Kubernetes README and values: https://github.com/splunk/splunk-connect-for-kubernetes
- Splunk SPL aggregate functions reference: https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.0/statistical-and-charting-functions/aggregate-functions

## Issues Found
- The Splunk OTel Collector HEC endpoint used `/services/collector`; updated it to `/services/collector/event`, which the chart values recommend for proper field extraction.
- The Splunk OTel Collector snippet used `logsCollection.enabled`, which is not a current top-level chart value, and added a custom `filelog/istio` receiver that would bypass the chart's Kubernetes container parser. Replaced it with supported `logsCollection.containers.extraOperators` and enabled `autodetect.istio`.
- The Splunk OTel `excludePaths` example used `/var/log/containers`, but the current chart tails `/var/log/pods/*/*/*.log`; updated the exclude pattern accordingly.
- The Fluent Bit grep filter ran after `Merge_Log On` and `Keep_Log Off`, so the `log` key it matched could already be removed. Moved the grep filter before the Kubernetes filter.
- The Fluent Bit Splunk output enabled `Splunk_Send_Raw On` without nesting the log under an `event` field, which can produce invalid HEC payloads. Set `Splunk_Send_Raw Off` so the plugin uses its normal event wrapping while still applying Splunk metadata options.
- The SC4K section described Splunk Connect for Kubernetes as an active official option. Updated it to identify SC4K as legacy and note its January 1, 2024 end-of-support date.
- The SC4K custom Fluentd grep filter body was not valid Fluentd filter syntax. Replaced it with a proper `<regexp>` block and set `fluentd.path` to the Istio proxy container log path.

## Review Notes
The Fluent Bit DaemonSet example remains intentionally minimal and assumes the referenced `splunk-hec-secret` and any RBAC needed by the Kubernetes filter are created separately. For new deployments, the Splunk OpenTelemetry Collector path is the best-supported option.
