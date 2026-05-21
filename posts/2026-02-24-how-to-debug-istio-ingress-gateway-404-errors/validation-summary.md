# Validation Summary: How to Debug Istio Ingress Gateway 404 Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio ingress gateway
- Istio Gateway and VirtualService resources
- Envoy listeners, filter chains, virtual hosts, routes, and clusters
- istioctl proxy-status, proxy-config, and analyze
- Kubernetes kubectl commands and TLS secrets
- curl host header and SNI debugging

## Sources Consulted
- Istio command reference for `istioctl proxy-config`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio "Debugging Envoy and Istiod" diagnostic tool documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio `istioctl analyze` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio IST0161 `InvalidGatewayCredential` analyzer documentation: https://istio.io/latest/docs/reference/config/analysis/ist0161/

## Issues Found
- The `istioctl proxy-config` examples used the Kubernetes shorthand `deploy/istio-ingressgateway`. The current Istio command reference documents deployment targets as `deployment/<deployment-name[.namespace]>`, so the examples were updated to `deployment/istio-ingressgateway`.
- The TLS secret section stated that a missing secret means the HTTPS listener will not be configured and that requests will get a 404 or connection refused. Istio documents invalid or missing gateway credentials as making the connection non-functional; the exact symptom can be TLS handshake failure, connection refused when no matching listener is available, or handling by another matching server. The wording was corrected.
- The gateway selector section said the default label is always `istio: ingressgateway`. Istio examples commonly use that label, but installation method can vary labels. The wording was changed to say it is a common default label.

## Review Notes
The post is accurate as a troubleshooting guide for Istio's networking API. Future improvements could mention the Kubernetes Gateway API separately, because Istio's ingress documentation now covers both Istio `Gateway`/`VirtualService` resources and Gateway API `Gateway`/`HTTPRoute` resources.
