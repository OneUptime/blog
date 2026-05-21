# Validation Summary: How to Monitor Istio Data Plane Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Prometheus
- PromQL
- Grafana
- Kiali
- Kubernetes

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio sidecar port reference: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Envoy upstream cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy circuit breaking reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking.html
- Kiali access documentation: https://kiali.io/docs/installation/installation-guide/accessing-kiali/

## Issues Found
- The `proxyStatsMatcher` example used `inclusionPrefixes` values such as `upstream_cx` and `upstream_rq`, but Envoy cluster stats are nested under cluster-specific stat names. Changed the example to use `inclusionRegexps` that match upstream, downstream, TLS, and circuit breaker stats more reliably.
- The post stated that subtracting source and destination percentiles roughly corresponds to network latency. Percentiles from separate distributions should not be subtracted as an exact latency measurement, so the wording now says comparison can help identify overhead without treating the difference as exact network latency.
- The connection overflow explanation said requests are rejected because the pool is exhausted. Envoy documents `upstream_cx_overflow` as the connection circuit breaker overflowing, so the explanation now refers to the connection circuit breaker being hit.
- The TLS metrics section listed `envoy_cluster_ssl_connections_total`, which is not a documented current Envoy cluster TLS metric. Replaced it with `envoy_cluster_ssl_session_reused`, which corresponds to Envoy's `cluster.<name>.ssl.session_reused` counter.
- The Telemetry resource used `apiVersion: telemetry.istio.io/v1alpha1`. Updated it to the current `telemetry.istio.io/v1` API version used in current Istio documentation.

## Review Notes
The PromQL examples are generally valid, but the Envoy metric names can vary with Istio and Envoy configuration. Istio's own documentation recommends checking Envoy stats in a canary environment before relying on dashboards or alerts across upgrades.
