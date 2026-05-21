# Validation Summary: How to Monitor Connection Drain Metrics in Istio

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Istio service metrics
- Envoy admin interface and statistics
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Kubernetes `kubectl` and container lifecycle hooks
- Fortio load testing

## Sources Consulted
- Istio standard metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy statistics access with `pilot-agent`: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Prometheus integration and metrics merging: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Envoy server statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy listener manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy draining behavior: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/draining
- Envoy administration interface: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Prometheus `promtool query instant`: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus recording and alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/ and https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes `kubectl run`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Fortio command-line documentation: https://github.com/fortio/fortio

## Issues Found
- The post listed `envoy_server_drain_count`, but Envoy documents `server.live`, `server.state`, and `server.total_connections`, not a `server.drain_count` metric. Replaced it with `envoy_server_live` and added `envoy_listener_manager_listener_stopped`.
- The introduction claimed the listed metrics show whether connections were forcibly closed. The covered metrics show connection counts, listener state, and client-visible errors, but not forced closes directly. Reworded the claim to avoid overpromising.
- The active connection dashboard panel subtracted Istio TCP open and close counters. That is fragile across pod restarts and scrape label churn. Replaced it with the Envoy `envoy_server_total_connections` gauge.
- The alert and historical query described `istio_tcp_connections_closed_total` as connection resets. Istio documents it as closed TCP connections, not resets. Renamed the alert and wording to connection close rate.
- The preStop script queried `http://localhost:15020/stats`, but Istio documents port 15020 for merged Prometheus telemetry at `/stats/prometheus`; raw Envoy admin stats are on port 15000. Updated the script to query Envoy admin `/stats?filter=^server.total_connections$`.
- The Fortio test used `kubectl run` without `--restart=Never` and wrote JSON to `/dev/stdout`. Updated it to create a one-shot pod with `--restart=Never --attach --rm`, run in the target namespace, and use Fortio's documented `-json -` stdout form.

## Review Notes
- `promtool` and `kubectl` were not installed in the local environment, so command verification used official documentation rather than local `--help` output.
- The Envoy dashboard query assumes Prometheus labels Envoy metrics with `namespace` and `pod`; label names can vary by scrape configuration, so users may need to adjust those selectors in their own Prometheus setup.
