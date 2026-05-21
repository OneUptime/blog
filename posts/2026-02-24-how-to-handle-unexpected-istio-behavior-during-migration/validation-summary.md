# Validation Summary: How to Handle Unexpected Istio Behavior During Migration

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Kubernetes sidecar injection
- Istio traffic management resources: DestinationRule, ServiceEntry, Sidecar

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio sidecar injection troubleshooting: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio DNS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Envoy access log response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post suggested annotating an existing pod with `sidecar.istio.io/inject="false"` and then deleting it to recreate it without a sidecar. For Deployment-managed workloads, that annotation would not persist to the replacement pod because automatic injection happens on new pods from the controller's pod template. Changed the example to patch the Deployment pod template with the supported `sidecar.istio.io/inject: "false"` label.
- The timeout section said the defaults for `http1MaxPendingRequests` and `http2MaxRequests` can be quite low. Current Istio DestinationRule documentation lists both defaults as `2^32-1`, so this was inaccurate. Changed the text to warn about explicitly configured low limits instead.
- The external service connectivity command ran `curl` from the `istio-proxy` container and used HTTP while the ServiceEntry example defined port 443. Istio proxy images commonly do not include curl, and the test should run from the application container. Changed the command to run from `my-app` and use `https://external-api.com`.
- The ServiceEntry example used `protocol: HTTPS` for opaque external TLS traffic on port 443. Istio's ServiceEntry examples for external HTTPS services use `protocol: TLS` so the proxy can route based on SNI. Changed the protocol to `TLS`.

## Review Notes
The post remains version-general and does not pin an Istio version. The reviewed API examples use current `networking.istio.io/v1` resources, and the referenced commands are consistent with current Istio and Kubernetes documentation.
