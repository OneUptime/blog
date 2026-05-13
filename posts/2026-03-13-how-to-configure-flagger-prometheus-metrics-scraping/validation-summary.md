# Validation Summary: How to Configure Flagger Prometheus Metrics Scraping

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flagger
- Prometheus
- Kubernetes
- Prometheus Kubernetes service discovery and relabeling
- Istio telemetry and Envoy metrics scraping
- Ingress-NGINX Controller metrics
- Linkerd proxy metrics
- Helm
- kubectl

## Sources Consulted
- Flagger metrics analysis documentation: https://fluxcd.io/flagger/usage/metrics/
- Flagger Kubernetes install documentation: https://fluxcd.io/flagger/install/flagger-install-on-kubernetes/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio telemetry metrics reference: https://istio.io/latest/docs/reference/config/telemetry/
- Ingress-NGINX monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- F5 NGINX Ingress Controller Prometheus metrics documentation: https://docs.nginx.com/nginx-ingress-controller/logging-and-monitoring/prometheus/
- Linkerd proxy metrics reference: https://linkerd.io/2.15/reference/proxy-metrics/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The NGINX Ingress Helm values put Prometheus annotations under `controller.metrics.service.annotations`, but the following Prometheus scrape job uses `role: pod` and filters on pod annotation meta labels. Changed the example to use `controller.podAnnotations` so the controller pods are discoverable by that scrape configuration.

## Review Notes
- The Istio custom scrape example matches Istio's documented `envoy-stats` job for ports ending in `-envoy-prom`. In current Istio installs, Prometheus metrics merging is enabled by default and exposes merged metrics through standard `prometheus.io` annotations at `:15020/stats/prometheus`; the custom job is still a documented option.
- The Ingress-NGINX examples apply to the community Kubernetes `ingress-nginx` controller, which exposes metrics on port `10254`. F5 NGINX Ingress Controller uses different Helm values and a different default Prometheus port.
- The Prometheus Operator commonly uses `ServiceMonitor` or `PodMonitor` resources instead of raw `scrape_configs`; the raw scrape configurations shown remain valid for standalone Prometheus or additional scrape configuration workflows.
