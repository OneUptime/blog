# Validation Summary: How to Set Up API Monitoring with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy sidecar telemetry
- Prometheus and PromQL
- Prometheus Operator PodMonitor and PrometheusRule resources
- Grafana dashboards
- Kubernetes manifests
- istioctl

## Sources Consulted
- Istio standard metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio sidecar ports / application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The Istio addon commands pinned `release-1.22`, which is outdated for a 2026 post. Updated the Prometheus and Grafana addon URLs to `release-1.30`, matching the current Istio documentation.
- The production scrape example used a `ServiceMonitor` with `targetPort: 15020`, but a ServiceMonitor selects Services and does not directly select every sidecar pod. Replaced it with a `PodMonitor` that selects pod endpoints on the injected `http-envoy-prom` port and scrapes `/stats/prometheus`, matching the Prometheus Operator resource model and Istio's documented Envoy scrape guidance.
- The post stated that metrics are exposed on port 15020 of each sidecar proxy. Clarified that default metrics merging exposes merged metrics at `:15020/stats/prometheus`, while Envoy-only sidecar telemetry is exposed through `http-envoy-prom`.
- The PromQL heading claimed request rate by HTTP method and path, but the query grouped by `request_protocol` and `response_code`; Istio's default standard labels do not include HTTP method or path. Updated the heading to "Request rate by protocol and response code."
- The custom Grafana ConfigMap wording implied the Istio sample Grafana addon automatically watches arbitrary dashboard ConfigMaps. Narrowed the wording to Grafana setups that watch dashboard ConfigMaps.
- The CLI quick check used `istioctl dashboard envoy`, which Istio now documents as deprecated in favor of `istioctl dashboard proxy`. Updated the command and comment.

## Review Notes
The PromQL examples are syntactically valid and use standard Istio metric names and labels. The SLO examples are workable, but for mature production SLOs the post could later discuss recording rules and `increase()`-based windows to reduce query cost and avoid repeatedly evaluating long-range rates.
