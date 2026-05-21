# Validation Summary: How to Debug Ingress Traffic Issues in Istio

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio ingress gateways
- Istio Gateway and VirtualService APIs
- istioctl proxy-config diagnostics
- Kubernetes Services and EndpointSlices
- Envoy access logs and response flags
- TLS secrets and certificate debugging

## Sources Consulted
- Istio Ingress Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Secure Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio InvalidGatewayCredential analyzer: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Envoy access log response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- Updated Istio Gateway and VirtualService examples from `networking.istio.io/v1beta1` to `networking.istio.io/v1`, matching current Istio documentation and promoted stable APIs.
- Clarified that TLS credential secrets must exist in the ingress gateway workload namespace, which may be `istio-system`, `istio-ingress`, or another install-specific namespace.
- Replaced `kubectl get endpoints my-app` with `kubectl get endpointslice -l kubernetes.io/service-name=my-app` because the legacy Kubernetes Endpoints API is deprecated as of Kubernetes v1.33.
- Clarified that ingress access logs are available when Envoy access logging is enabled.
- Corrected the `426` explanation. Envoy commonly returns 426 for HTTP/1.0 requests; HTTP-to-HTTPS redirects in Istio are normally configured as redirects such as 301.

## Review Notes
The remaining commands and examples align with Istio and Kubernetes documentation. The post assumes the classic Istio Gateway and VirtualService APIs, not the Kubernetes Gateway API, which is still valid but worth making explicit in future revisions.
