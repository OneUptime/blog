# Validation Summary: How to Enable Debug Logging for Envoy Proxy in Istio

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- Envoy Proxy
- Kubernetes
- istioctl
- Envoy admin API
- Envoy application and access logging

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Envoy administration interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy command-line logging options: https://www.envoyproxy.io/docs/envoy/latest/operations/cli
- Envoy logging source documentation: https://raw.githubusercontent.com/envoyproxy/envoy/main/source/docs/logging.md
- Envoy logger IDs source: https://raw.githubusercontent.com/envoyproxy/envoy/main/source/common/common/logger.h
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- Envoy's `/logging` admin endpoint is documented as `POST /logging`, including for listing current loggers. Updated the "View current levels" curl command to use `-XPOST`.
- The in-pod example used `curl` from the `istio-proxy` container. Current Istio documentation exposes `pilot-agent request` for Envoy admin API calls and Istio proxy images may not include curl. Replaced the example with `pilot-agent request POST "logging?level=debug"`.
- The log filtering examples and explanation used malformed connection and stream identifiers like `[C[123]]` and `[S[456]]`. Envoy's logging documentation shows connection/stream prefixes as `[C123]` and `[C123][S456]`. Updated the grep patterns and explanatory text.

## Review Notes
The post is technically relevant and the remaining `istioctl proxy-config log`, pod annotation, Envoy logger, and Kubernetes examples are consistent with current official documentation. Debug logging remains high-volume and should be scoped narrowly in production.
