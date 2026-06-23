# Validation Summary: How to Monitor Istio with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Prometheus
- Grafana
- Kubernetes
- Helm
- PromQL
- Istio Telemetry API
- Prometheus Operator PrometheusRule resources

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API metrics customization task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Prometheus Community Helm chart repository and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Helm chart installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/

## Issues Found
- The architecture diagrams referenced Citadel and Galley as standalone Istio control-plane components. Modern Istio consolidates these responsibilities into istiod, so the diagrams were updated to describe xDS configuration, certificate authority, and webhook metrics instead.
- The Istio sample addon URLs were pinned to `release-1.20`. The examples were updated to `release-1.30` and the prerequisites now state that the sample addon URLs use Istio 1.30.
- The custom Envoy scrape job selected pods by `istio-proxy` container name and manually rewrote the port to 15090. Istio's current documented scrape pattern selects ports named `*-envoy-prom`, so the relabeling was corrected.
- The obsolete `istio-telemetry;prometheus` scrape job was removed because Mixer-era telemetry is no longer part of current Istio.
- The control-plane query for connected proxies used `sum(pilot_xds_pushes{type="cds"})`, which measures pushes rather than connected proxies. It was changed to `sum(pilot_xds)`.
- The alert rule used a non-current `pilot_xds_push_errors` metric. It was changed to `pilot_total_xds_internal_errors`, which is listed in the current istiod metric reference.
- The PrometheusRule examples did not state that they require Prometheus Operator or kube-prometheus-stack. The post now calls out that dependency for alerting and recording rules.
- The `promtool check rules istio-alerts.yaml` command was inaccurate for a Kubernetes `PrometheusRule` manifest. It was replaced with `kubectl apply --dry-run=server -f istio-alerts.yaml`.
- The Telemetry API example used `telemetry.istio.io/v1alpha1`. It was updated to the stable `telemetry.istio.io/v1` API.
- The custom metrics EnvoyFilter example contained placeholder Wasm inline code that would not work as a deployable filter. It was replaced with a Telemetry API custom dimension example.
- The IstioOperator cardinality example used stale `values.telemetry.v2.prometheus.configOverride` fields. Those fields were removed, leaving supported mesh-level proxy stats matching and directing label customization to Telemetry resources.
- The Grafana Node Graph panel example did not provide the data-frame fields required by Grafana Node Graph. It was changed to a table panel for service traffic pairs.
- Several Prometheus service port-forward and Grafana connectivity commands were adjusted to match the Helm chart service name and port used elsewhere in the post.

## Review Notes
The post is now technically valid as a guide, but several examples still depend on the reader's chosen deployment path. In particular, Istio sample addons are demonstration-only, while the PrometheusRule resources require Prometheus Operator selection rules to be configured. The embedded YAML and JSON blocks were parsed locally for syntax, but live cluster validation was not performed.
