# Validation Summary: How to Set Up API Analytics with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Envoy access logging
- Prometheus and PromQL
- Grafana
- Kiali
- Kubernetes custom resources and ConfigMaps

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Kiali integration: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio custom metrics examples: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The Istio sample add-on URLs pinned `release-1.20`, which is outdated for a 2026 post. Updated the Prometheus, Grafana, and Kiali sample URLs to `release-1.30`, matching the current Istio documentation.
- The dashboard list referred to a generic "Performance Dashboard"; current Istio Grafana docs identify the control-plane dashboard separately. Updated it to "Control Plane Dashboard".
- Several PromQL examples filtered or grouped by `request_host` and `request_url_path`, but those are not default Istio metric labels. Added `request_host` to the Telemetry tag overrides and added a short note that those labels come from the custom Telemetry configuration.
- The per-client "error rates" query only returned 5xx request rate, not an error ratio. Updated it to divide client 5xx rate by total client request rate.
- The remote-write ConfigMap text claimed the snippet directly forwards metrics. Clarified that this must be added to the Prometheus configuration.
- The "Busiest hours" query grouped by a non-existent `hour` label. Replaced it with an hourly request volume query using `increase(...[1h])`.

## Review Notes
- The Istio sample add-ons are documented as quick-start/demo installations and are not tuned for production performance or security.
- The custom labels shown here can increase metric cardinality, especially `client_id` and raw URL paths. Production deployments should control label cardinality carefully.
