# Validation Summary: How to Integrate Istio with Datadog for Observability

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio
- Datadog Agent
- Datadog Helm chart
- Datadog Kubernetes Autodiscovery
- Datadog APM and Service Map
- Kubernetes
- Envoy access logs

## Sources Consulted
- Datadog Istio integration documentation: https://docs.datadoghq.com/integrations/istio/
- Datadog Kubernetes and integrations Autodiscovery documentation: https://docs.datadoghq.com/containers/kubernetes/integrations/
- Datadog Kubernetes log collection documentation: https://docs.datadoghq.com/containers/kubernetes/log/
- Datadog advanced log collection documentation: https://docs.datadoghq.com/agent/logs/advanced_log_collection/
- Datadog Service Map documentation: https://docs.datadoghq.com/tracing/services/services_map/
- Datadog unified service tagging documentation: https://docs.datadoghq.com/getting_started/tagging/unified_service_tagging/
- Datadog Helm chart values: https://github.com/DataDog/helm-charts/blob/main/charts/datadog/values.yaml
- Datadog Istio integration sample configuration: https://github.com/DataDog/integrations-core/blob/master/istio/datadog_checks/istio/data/conf.yaml.example
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Telemetry API tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/

## Issues Found
- The Istio sidecar metrics examples used `http://%%host%%:15090/stats/prometheus` and older OpenMetrics options. Updated them to Datadog's current Istio integration pattern using `use_openmetrics: true`, `http://%%host%%:15020/stats/prometheus`, `proxyv2-rhel8`, `send_histograms_buckets: false`, and `tag_by_endpoint: false`.
- The control plane check omitted `use_openmetrics: true` and did not enable cluster checks in the Helm values example. Added `datadog.clusterChecks.enabled: true` and `use_openmetrics: true` for the `istiod_endpoint` check.
- The cluster-wide sidecar metrics example used generic Prometheus/OpenMetrics scraping against the Istio proxy endpoint, which Datadog warns can duplicate Istio/Envoy metrics and increase custom metric usage. Replaced it with the Istio integration Autodiscovery configuration.
- The Envoy access log example used an invalid Helm value path, `datadog.logsConfig.processingRules`, and filtered by message text rather than configuring Istio proxy log collection. Replaced it with the official Autodiscovery log annotation for the `istio-proxy` container.
- The dashboard examples referenced non-existent or ambiguous metrics such as `istio.mesh.connections_active` and `p99:istio.mesh.request.duration.milliseconds`. Replaced them with documented Istio metrics for average latency and TCP connection open rate.
- The Service Map section said the map is built from Istio telemetry data. Updated it to clarify that Datadog Service Map is built from APM trace data, with Istio tracing contributing spans.
- Several Kubernetes `Deployment` snippets were incomplete for the fields being demonstrated. Added selectors, pod labels, containers, and Datadog environment variables where needed to keep examples structurally valid.

## Review Notes
The Datadog Istio integration now recommends OpenMetrics latest mode for current Istio deployments. The tracing section uses Istio's Telemetry API, which is the direction recommended by current Istio documentation, although Datadog's APM proxy documentation still includes older installation flags for some supported Istio releases.
