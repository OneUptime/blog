# Validation Summary: How to Access Envoy Admin Dashboard in Istio

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Istio
- Envoy admin interface
- Kubernetes kubectl
- istioctl
- pilot-agent
- Prometheus metrics

## Sources Consulted
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Envoy administration interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Envoy admin quick start for config_dump: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/admin.html
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post used `istioctl dashboard envoy`. Istio's current command reference marks `dashboard envoy` as deprecated and recommends `dashboard proxy`, so the command and later reference were updated to `istioctl dashboard proxy`.
- The post said Prometheus scrapes Istio metrics from the Envoy admin `/stats/prometheus` endpoint on port 15000. Envoy does expose Prometheus-formatted stats there, but default Istio scraping usually targets merged telemetry on `:15020/stats/prometheus` or Envoy-only telemetry on port `15090`, so that explanation was corrected.
- The post used `GET /logging` to view current log levels. Envoy documents `/logging` as a `POST` endpoint, including when listing logger levels without query parameters, so the command was changed to `pilot-agent request POST /logging`.

## Review Notes
The remaining admin endpoints and `pilot-agent request` examples align with current Envoy and Istio documentation. The post is sidecar-focused; ambient-mode proxies have different operational details and are outside the scope of this guide.
