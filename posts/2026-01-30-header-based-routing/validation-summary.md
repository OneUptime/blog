# Validation Summary: How to Build Header-Based Routing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP header-based routing
- NGINX Ingress Controller
- Traefik IngressRoute and Headers middleware
- Istio VirtualService, DestinationRule, and AuthorizationPolicy
- Kong Ingress Controller and Kong plugins
- Envoy route configuration
- Express.js / Node.js middleware
- curl and jq testing commands

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy core HeaderValueOption API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/base.proto
- Traefik HTTP router rules reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Traefik Headers middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Kong Ingress Controller KongIngress migration guide: https://developer.konghq.com/kubernetes-ingress-controller/migrate/kongingress/
- Kong Ingress Controller custom resource reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Request Transformer plugin reference: https://developer.konghq.com/plugins/request-transformer/
- Kong Response Transformer plugin reference: https://developer.konghq.com/plugins/response-transformer/
- Ingress-NGINX annotations documentation: https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/nginx-configuration/annotations.md
- Node.js HTTP API documentation: https://nodejs.org/api/http.html
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- Traefik regex routing used `HeadersRegexp`, but the current Traefik matcher is `HeaderRegexp`. Updated the IngressRoute rule.
- Istio presence matching used `exact: "*"`, which matches a literal asterisk rather than any value. Updated the example to use Istio's documented empty header match object.
- Several Istio header match keys used mixed-case names. Updated match keys to lowercase with hyphens, as required by the VirtualService reference.
- Kong route header examples used deprecated `KongIngress` route fields and `konghq.com/override`. Replaced them with current `konghq.com/headers.*` annotations on Kubernetes Ingress resources.
- The Express version routing example referenced `handleUsersLatest()` without defining it. Added a small fallback handler that delegates to the v2 handler.
- The Traefik Headers middleware example defined `customRequestHeaders` twice in the same YAML mapping, which would overwrite the first mapping. Combined the request header additions and removals into one mapping.
- The Kong transformation example used unsupported placeholder-style values such as `$(now)`, `$(uuid)`, `$(client_ip)`, and response `$(latency)`. Replaced them with documented static values and a valid request header template.
- The Envoy default header example used deprecated `append: false` and described it as "only add if not present", but Envoy documents `append` as deprecated and replacement/append behavior, not add-if-absent. Updated the snippet to use `append_action: ADD_IF_ABSENT` and `OVERWRITE_IF_EXISTS_OR_ADD`.

## Review Notes
JavaScript snippets were syntax-checked successfully with Node.js. YAML snippets were reviewed manually against the referenced CRD/API documentation; a local Ruby YAML parser was not available in the environment.
