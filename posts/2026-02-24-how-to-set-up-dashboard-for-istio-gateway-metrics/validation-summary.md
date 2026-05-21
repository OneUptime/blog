# Validation Summary: How to Set Up Dashboard for Istio Gateway Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio gateways and telemetry
- Envoy proxy metrics
- Prometheus and PromQL
- Grafana dashboards and variables
- Kubernetes kubectl port-forward

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Envoy listener statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy server statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy HTTP connection manager statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/dashboards/export-import/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The opening claim said all external traffic flows through Istio gateways. This is only true for traffic routed through gateways, especially for egress traffic. Updated the wording to avoid implying every external path must traverse an Istio gateway.
- The metrics endpoint description said the metrics are available on port 15090. Istio documentation distinguishes merged telemetry on port 15020 from Envoy-only telemetry on port 15090, depending on scrape configuration. Updated the description to include both.
- The Grafana dashboard was described as directly importable JSON while using the legacy dashboard API wrapper. Updated the wording to identify it as a Grafana dashboard API payload and added `id`, `uid`, `schemaVersion`, and `version` fields to the dashboard object.
- The "Active Connections" panel used `envoy_server_total_connections`, which Envoy documents as a server-level total connection gauge, not listener downstream active connections. Updated the panel to use `envoy_listener_downstream_cx_active` and renamed it "Active Downstream Connections".
- The Istio Grafana addon URL referenced `release-1.20`, which is outdated relative to the current official Istio documentation. Updated it to `release-1.29`.

## Review Notes
The PromQL examples for Istio request rate, error rate, latency histogram quantiles, and request/response size are syntactically valid and align with Istio's standard metric names. The examples assume the default `istio-ingressgateway` and `istio-egressgateway` workload names and Prometheus labels such as `pod`; users with customized gateway deployments or relabeling may need to adjust those selectors.
