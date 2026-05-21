# Validation Summary: How to Monitor JWT Authentication Metrics in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy JWT authentication filter
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana
- Istio Telemetry API

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Envoy statistics configuration: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping reference for ports 15020 and 15090: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio access log configuration with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy JWT authentication filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter
- Envoy HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/
- Prometheus querying basics and metric name matching: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- Corrected the Envoy HTTP response-class counter name from `envoy_http_downstream_rq_xx` to Envoy's documented `http.<stat_prefix>.downstream_rq_xx` form, with a note about the Prometheus `envoy_http_..._downstream_rq_xx` naming pattern.
- Clarified 403 behavior. Istio RequestAuthentication accepts requests without credentials unless an AuthorizationPolicy requires an authenticated principal, so missing-token failures are authorization denials rather than direct JWT validation failures.
- Replaced the "EnvoyFilter" / Telemetry wording for surfacing Envoy JWT stats with `proxyStatsMatcher`, because Istio records a minimal Envoy stat set by default and additional Envoy JWT filter counters must be included explicitly.
- Corrected the Prometheus scraping note to distinguish Istio's merged metrics endpoint on port 15020 from Envoy-only metrics on port 15090.
- Updated the JWKS fetch failure alert to match Envoy JWT metrics with the dynamic HTTP connection manager stat prefix instead of using a fixed metric name.
- Clarified that JWKS success counters increment when keys are fetched or refreshed, not necessarily on a fixed periodic schedule.

## Review Notes
The `istio_requests_total` queries, Istio Telemetry access logging snippet, Kubernetes command shapes, Envoy JWT stat names, and PrometheusRule structure are technically valid. The Envoy JWT metrics depend on proxy stat inclusion and on the generated Prometheus metric names in a specific Istio/Envoy deployment, so dashboards and alerts should be checked against `/stats/prometheus` in the target cluster before rollout.
