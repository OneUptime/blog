# Validation Summary: How to Configure Telemetry Filtering in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Envoy proxy statistics
- Envoy access logging
- Prometheus and PromQL
- Kubernetes kubectl commands

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio customizing metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio metric classification task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/

## Issues Found
- The Telemetry examples used `apiVersion: telemetry.istio.io/v1alpha1`. Current Istio documentation uses the stable `telemetry.istio.io/v1` API, so all Telemetry snippets were updated to `v1`.
- The per-workload metric filtering example removed `source_namespace`, which is not the standard Istio metric label. It was changed to `source_workload_namespace`, and the explanatory text was updated to match.
- The client/server mode trade-off said server-mode metrics do not show who is calling. Istio server-side metrics can still include source labels when the caller is known, so the explanation was corrected to say that disabling client mode loses the source proxy's outbound view.
- The access-log filtering example used a low-level EnvoyFilter for response-code filtering. Istio's Telemetry API supports access log `filter.expression`, so the example was replaced with the native Telemetry configuration for logging only `response.code >= 400`.

## Review Notes
The Envoy-native stats example still uses `IstioOperator` with `meshConfig.defaultConfig.proxyStatsMatcher`, which remains consistent with Istio documentation. The exact Prometheus `job` label values in the impact assessment can vary by installation, but the PromQL examples are structurally valid.
