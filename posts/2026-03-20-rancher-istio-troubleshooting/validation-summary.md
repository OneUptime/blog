# Validation Summary: How to Troubleshoot Istio Issues in Rancher

## Status
validated

## Post Type
Troubleshooting Guide / Reference

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes (`kubectl`, Services, EndpointSlice, NetworkPolicy)
- Istio (`istioctl`, sidecar injection, mTLS, VirtualService, DestinationRule, Telemetry)
- Envoy proxy diagnostics and logging

## Sources Consulted
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection docs: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio check-inject diagnostic: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio describe diagnostic: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Envoy statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl_run/

## Issues Found
1. `istioctl authn tls-check` was removed from current Istio. I replaced it with `istioctl x describe pod ...`, which is the current documented way to surface mTLS conflicts and confirm when workloads enforce and use mTLS.
2. The post described `sidecar.istio.io/inject` as a pod annotation. Current Istio documentation uses the `sidecar.istio.io/inject` label and marks the annotation form as deprecated. I updated the wording and replaced the static webhook check with `istioctl experimental check-inject`, which is the current injection troubleshooting command.
3. The Telemetry manifest used `telemetry.istio.io/v1alpha1`. I updated it to `telemetry.istio.io/v1`, which is the current API version shown in Istio documentation.
4. The 503 troubleshooting example used `kubectl get endpoints`. The Kubernetes Endpoints API is deprecated in current Kubernetes releases, so I updated the command to use `EndpointSlice`.
5. Several commands/comments were technically misleading on current releases. I replaced direct Envoy log-level `curl` calls with `istioctl proxy-config log`, changed the stats example to `pilot-agent request GET stats` so it does not assume `curl` exists in the proxy image, clarified that Services route via `targetPort`, and clarified that `kubectl describe destinationrule` shows configured circuit breaker and outlier detection settings rather than live ejection state.

## Review Notes
- The guide is accurate for Istio sidecar mode. It does not apply to ambient mesh troubleshooting, which uses different diagnostics such as `istioctl ztunnel-config`.
- Revisioned Istio installations can expose multiple injection webhooks. Using `istioctl experimental check-inject` is more reliable than assuming a single `istio-sidecar-injector` webhook name.
- Rancher does not materially change the `kubectl` and `istioctl` troubleshooting flow covered here, so the corrected commands remain applicable to Rancher-managed clusters running Istio.
