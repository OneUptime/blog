# Validation Summary: How to Limit ArgoCD API Rate for Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- ingress-nginx
- Traefik
- Kong Ingress Controller and Kong Gateway rate limiting
- Envoy local rate limiting
- PrometheusRule
- kubectl

## Sources Consulted
- Argo CD user management documentation: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/user-management/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD ingress configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Traefik RateLimit middleware documentation: https://doc.traefik.io/traefik/v3.4/middlewares/http/ratelimit/
- Traefik Kubernetes CRD routing documentation: https://doc.traefik.io/traefik/master/routing/providers/kubernetes-crd/
- Kong rate-limiting plugin documentation: https://developer.konghq.com/plugins/rate-limiting/
- Kong Ingress Controller KongPlugin and annotation documentation: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/ and https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Envoy HTTP local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy local rate limit API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto

## Issues Found
- The Argo CD login rate limiting example used non-current `argocd-cmd-params-cm` keys. Replaced it with the official environment variables for failed login count, failure window, and concurrent login requests.
- The NGINX example combined `ssl-passthrough` with HTTP rate limiting annotations. ingress-nginx documents that SSL passthrough invalidates other Ingress annotations, so the example now uses HTTPS upstream routing without passthrough and notes the 429 status-code ConfigMap setting.
- The NGINX rate limit explanation omitted that limits apply per ingress-nginx controller replica. Updated the wording to avoid understating the effective limit in replicated/HPA deployments.
- Endpoint-specific NGINX examples were missing the HTTPS backend protocol and ingress class. Added them for consistency with Argo CD's TLS service.
- The Traefik example routed to Argo CD's TLS service without declaring HTTPS upstream scheme. Added `scheme: https`.
- The Kong example set `policy: local` while also configuring Redis. Changed it to `policy: redis` and added a note about setting `konghq.com/protocol: https` on the Kubernetes Service when Kong connects to Argo CD's TLS port.
- The Envoy local rate limit filter did not explicitly enable or enforce rate limiting. Added `filter_enabled` and `filter_enforced` at 100%, and removed an unrelated route-level remote-address descriptor block.

## Review Notes
The examples are generally valid as rate-limiting patterns, but Argo CD ingress behavior depends on whether the deployment terminates TLS at the ingress/gateway or at `argocd-server`. Future revisions could add separate examples for UI-only HTTP routing, CLI gRPC routing, and TLS passthrough cases.
