# Validation Summary: How to Configure Istio Ingress for HTTP to HTTPS Redirect

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio ingress gateway
- Envoy redirects
- Kubernetes Gateway API HTTPRoute
- TLS and HTTPS
- HSTS
- kubectl
- istioctl
- curl
- OpenSSL

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio gateway network topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Gateway API HTTP redirect and rewrite guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Kubernetes Gateway API HTTPRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/httproute/
- Envoy route redirect action reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- MDN Strict-Transport-Security reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- RFC 6797 HTTP Strict Transport Security: https://www.rfc-editor.org/rfc/rfc6797.html

## Issues Found
- The HSTS explanation said the browser would "never even try HTTP" after seeing the header once. Updated it to say browsers upgrade future HTTP attempts until the max-age policy expires, and clarified that the header must be received over HTTPS.
- The redirect-loop guidance suggested fixing TLS-terminating load balancer loops by "using the X-Forwarded-Proto header." Updated it to more accurately describe valid fixes: TLS passthrough, forwarding HTTPS to the gateway, or configuring trusted forwarded-proto/topology handling for the gateway.

## Review Notes
- The Istio `Gateway` and `VirtualService` examples use current `networking.istio.io/v1` APIs and valid fields for `httpsRedirect`, TLS termination, redirect rules, header setting, and port matches.
- The Gateway API `HTTPRoute` redirect example uses the current `gateway.networking.k8s.io/v1` API and a valid `RequestRedirect` filter, assuming a matching Gateway listener named `http` exists.
- The `openssl s_client` example is technically valid but remains interactive unless input is closed; this is acceptable for a manual certificate inspection command.
