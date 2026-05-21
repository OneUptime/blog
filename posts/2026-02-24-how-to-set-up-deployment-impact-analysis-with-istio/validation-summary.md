# Validation Summary: How to Set Up Deployment Impact Analysis with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Kubernetes Deployments and Services
- Istio VirtualService and DestinationRule traffic management
- Istio standard Prometheus metrics
- Prometheus recording rules and HTTP API
- Grafana annotations
- Bash, curl, jq, bc, and kubectl

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus Operator PrometheusRule documentation: https://prometheus-operator.dev/kube-prometheus/kube/developing-prometheus-rules-and-grafana-dashboards/
- Grafana Annotations HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/annotations/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The canary example routed Istio traffic to `my-service`, but the Kubernetes manifests only created two Deployments and did not create the `my-service` Service. Istio route destinations should refer to services in the service registry, and Kubernetes service discovery requires a Service object for the stable host. I added a Service manifest and container ports to make the example apply cleanly.
- The Istio traffic management snippets used `networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for VirtualService and DestinationRule, so I updated both snippets to `v1`.

## Review Notes
- The Istio metric names and labels used in the PromQL examples, including `istio_requests_total`, `istio_request_duration_milliseconds_bucket`, `reporter`, `destination_service_name`, and `destination_version`, match Istio's standard metrics documentation.
- The Grafana annotation example uses the legacy `/api/annotations` endpoint, which remains supported, but Grafana documentation notes that `/api` endpoints are deprecated starting in Grafana 13 in favor of `/apis` routes as migration work continues.
- The Prometheus HTTP API usage with `POST /api/v1/query` and URL-encoded query parameters is valid.
