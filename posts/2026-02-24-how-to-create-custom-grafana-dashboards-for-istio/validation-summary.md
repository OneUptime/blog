# Validation Summary: How to Create Custom Grafana Dashboards for Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Grafana
- Prometheus
- PromQL
- Kubernetes kubectl

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl / exported control-plane metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana Node graph visualization data requirements: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/node-graph/
- Prometheus query functions / histogram_quantile: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The addon installation commands used Istio `release-1.22`, which is no longer a supported Istio release. Updated the Grafana and Prometheus sample addon URLs to `release-1.30`, matching the current Istio documentation.
- The Grafana variable examples used the deprecated classic `label_values(...)` query syntax. Updated them to the current Label values query type format with explicit metric and label fields.
- The dashboard variables were configured as multi-value and Include All, but several queries used exact-match label selectors. Updated variable-dependent selectors to use regex matchers such as `=~"$namespace"` and `=~"$service"`, as required by Grafana for multi-value variables.
- The Istio request, latency, and TCP queries did not constrain the `reporter` label, which can double-count source and destination proxy reports. Added `reporter="destination"` to service-health queries so the dashboard reflects destination-side service metrics.
- The node graph example implied that a raw Prometheus query can be used directly as a Grafana node graph. Clarified that Grafana's node graph panel requires transformation into an edge data frame with `id`, `source`, and `target` fields.
- The control-plane section referenced `pilot_xds_push_errors`, which is not a current documented Istio metric. Replaced it with `pilot_total_xds_internal_errors` plus `pilot_total_xds_rejects`.
- The control-plane "Pilot push latency" example used proxy convergence latency. Replaced it with `pilot_xds_push_time_bucket`, which matches the push-latency label.
- The "Config validation errors" example used `pilot_total_xds_rejects`, which tracks proxy xDS rejects. Replaced it with `pilot_total_rejected_configs`, which better matches rejected or ignored config.

## Review Notes
The PromQL examples are syntactically valid by inspection and use documented Istio metric names. `kubectl` was not run against a live cluster, so runtime behavior of the sample addon manifests was verified against Istio's official integration documentation rather than by applying them.
