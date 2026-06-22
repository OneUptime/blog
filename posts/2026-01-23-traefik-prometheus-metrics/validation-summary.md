# Validation Summary: How to Configure Prometheus Metrics with Traefik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy Prometheus metrics
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Kubernetes Service and kubectl port-forward
- Grafana dashboards

## Sources Consulted
- Traefik Proxy metrics documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Grafana pie chart visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/pie-chart/

## Issues Found
- The post listed `traefik_entrypoint_open_connections` and `traefik_service_open_connections`, but current Traefik documentation lists open connections as the global Prometheus metric `traefik_open_connections` with `entrypoint` and `protocol` labels. Updated the available metrics list and connection PromQL examples.
- The custom `headerLabels` example had the mapping reversed. Traefik expects Prometheus label name to request header name, such as `tenant: X-Tenant-ID`. Updated the commented example.
- The Grafana dashboard example used the legacy `graph` panel type. Updated the time-series panels to `timeseries`, matching current Grafana guidance.

## Review Notes
- The Traefik static configuration, Prometheus scrape configuration, ServiceMonitor fields, PrometheusRule examples, kubectl port-forward command, and PromQL request/error/latency queries are consistent with the consulted documentation.
- The example assumes the Traefik pods expose the same named/numbered ports selected by the Service and that the Prometheus Operator instance selects ServiceMonitors with the shown `release: prometheus` label.
