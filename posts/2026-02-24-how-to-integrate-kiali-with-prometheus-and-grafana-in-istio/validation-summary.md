# Validation Summary: How to Integrate Kiali with Prometheus and Grafana in Istio

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio
- Kiali and the Kiali Operator CR
- Prometheus
- Grafana
- Kubernetes and kubectl
- Envoy sidecar metrics

## Sources Consulted
- Kiali Grafana configuration: https://kiali.io/docs/configuration/p8s-jaeger-grafana/grafana/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali external service CA bundle notes: https://kiali.io/docs/faq/installation/
- Kiali Jaeger tracing configuration: https://kiali.io/docs/configuration/p8s-jaeger-grafana/tracing/jaeger/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio release-1.27 sample addon manifests: https://raw.githubusercontent.com/istio/istio/release-1.27/samples/addons/prometheus.yaml, https://raw.githubusercontent.com/istio/istio/release-1.27/samples/addons/grafana.yaml, https://raw.githubusercontent.com/istio/istio/release-1.27/samples/addons/kiali.yaml
- Istio 1.27.0 Grafana dashboard manifests: https://raw.githubusercontent.com/istio/istio/refs/tags/1.27.0/manifests/addons/dashboards/istio-service-dashboard.json
- Grafana query caching documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/enterprise-configuration/

## Issues Found
- The prerequisite pod checks used legacy `app=prometheus` and `app=grafana` selectors. Updated them to the labels used by the Istio sample addon manifests: `app.kubernetes.io/name=prometheus` and `app.kubernetes.io/name=grafana`.
- The Istio sample addon URLs and dashboard download version used Istio 1.22. Updated examples to the current release branch/tag checked during review, `release-1.27` and `1.27.0`.
- The architecture text said Envoy sidecars expose metrics only on port 15090. Updated it to mention both Envoy-only telemetry on 15090 and Istio merged Prometheus telemetry on 15020 at `/stats/prometheus`.
- Kiali Grafana snippets used older `in_cluster_url` and `url` fields. Updated them to current Kiali CR fields `internal_url` and `external_url`, including verification notes and the full example.
- The Prometheus custom CA example used `auth.ca_file`, which is deprecated in current Kiali. Replaced it with the `kiali-cabundle` ConfigMap pattern used by current Kiali TLS configuration.
- The Grafana dashboard mapping omitted the `datasource` variable used by the current Istio dashboards. Added `datasource: "var-datasource"` to the Kiali dashboard variable mappings.
- The Grafana API import command used the in-cluster service DNS name from a local shell context. Added a `kubectl port-forward` step and changed the API URL to `http://localhost:3000/api/dashboards/db`.
- The custom metrics section implied Kiali could be told about renamed Istio metrics while showing only a Prometheus URL. Adjusted the wording to state that Kiali expects standard Istio metric names and that prefixed/renamed metrics should be exposed with recording rules.
- The Grafana caching recommendation was too broad for all Grafana editions. Updated it to note that query caching should be enabled if available in the user's Grafana edition.
- The tracing example used the old `in_cluster_url` field. Updated it to `internal_url`.

## Review Notes
Istio's sample addons are intended for quick demos and evaluation rather than hardened production deployments. The post now uses current field names and current sample addon versions, but future Kiali releases may continue to evolve the external service configuration schema.
