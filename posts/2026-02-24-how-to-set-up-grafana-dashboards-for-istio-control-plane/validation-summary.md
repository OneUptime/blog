# Validation Summary: How to Set Up Grafana Dashboards for Istio Control Plane

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istiod / Istio control plane
- Grafana
- Prometheus / PromQL
- Kubernetes
- Envoy xDS

## Sources Consulted
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio pilot-discovery command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy-status diagnostic documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio observability best practices: https://istio.io/latest/docs/ops/best-practices/observability/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/

## Issues Found
- The Grafana add-on install command used the older `release-1.20` URL. Updated it to the current Istio documentation's `release-1.30` URL.
- The xDS push error query used `pilot_xds_push_errors`, which is not listed in the current istiod exported metrics. Replaced it with `pilot_total_xds_rejects` and `pilot_total_xds_internal_errors`, which are documented current metrics.
- The text described `pilot_push_triggers` as a push queue size. Istio documents it as a counter for push triggers labeled by reason. Updated the query and added `pilot_worker_queue_depth` for queue depth.
- The sidecar injection query grouped `sidecar_injection_requests_total` by a `success` label, but current Istio exposes separate request, success, and failure counters. Replaced the success grouping with `sidecar_injection_success_total`.
- The scaling section used `pilot_endpoints`, which is not listed in the current istiod exported metrics. Replaced the endpoint count and ratio with `pilot_xds` to track connected proxies.
- The alert for xDS push errors used the same unsupported `pilot_xds_push_errors` metric. Updated it to alert on `pilot_total_xds_rejects` or `pilot_total_xds_internal_errors`.

## Review Notes
The Prometheus container CPU and memory queries depend on Kubernetes/cAdvisor metrics being scraped by the Prometheus deployment, not on Istio itself. The Istio quick-start add-ons are intended for demonstration and are not tuned for production performance or security.
