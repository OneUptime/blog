# Validation Summary: How to Monitor Istio Service Health with OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Istio Gateway and VirtualService resources
- Kubernetes Deployments and health probes
- Prometheus / PromQL metrics
- OneUptime monitors and dashboards
- kubectl, istioctl, and jq

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio Ingress Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- OneUptime Kubernetes Monitor documentation: https://oneuptime.com/docs/monitor/kubernetes-monitor
- OneUptime Website Monitor documentation: https://oneuptime.com/docs/monitor/website-monitor

## Issues Found
- The Kubernetes `Deployment` example for `my-service` omitted the required `spec.selector` and matching pod template labels for `apps/v1`. I added `spec.selector.matchLabels` and `template.metadata.labels` so the manifest is valid.
- The "Connection Errors" PromQL query used `istio_tcp_connections_closed_total`, which counts closed TCP connections rather than failures. I changed the example to track HTTP upstream connection failures using `istio_requests_total` with `response_code="503"` and the `UC` response flag.
- The control plane metrics list referenced `pilot_xds_push_errors`, which is not listed in the current Istio exported metrics. I replaced it with `pilot_total_xds_internal_errors`, alongside `pilot_total_xds_rejects`.
- The sidecar-injection check claimed to find pods in labeled namespaces but only checked pod labels and a hard-coded namespace. I replaced it with a command that enumerates namespaces labeled with `istio-injection=enabled` or `istio.io/rev`, then reports pods in those namespaces missing the `istio-proxy` container.

## Review Notes
- The YAML snippets were parsed locally after the fixes.
- The PromQL examples are syntactically plausible for a Prometheus setup scraping Istio standard metrics, but exact label availability can vary if Istio Telemetry metric overrides suppress dimensions.
- The OneUptime Kubernetes monitor documentation describes Kubernetes monitoring through the OneUptime Kubernetes agent / OpenTelemetry integration; the post's high-level setup wording remains compatible with that model.
