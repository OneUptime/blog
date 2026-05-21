# Validation Summary: How to Secure Istio Dashboard Access

## Status
validated

## Post Type
Security guide / tutorial

## Technologies Covered
- Istio
- Kubernetes RBAC and kubectl
- Kiali
- Grafana
- Prometheus
- OAuth2 Proxy
- Jaeger / Jaeger Operator

## Sources Consulted
- Kiali authentication strategies: https://kiali.io/docs/configuration/authentication/
- Kiali OpenID Connect strategy: https://kiali.io/docs/configuration/authentication/openid/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali namespace access control: https://kiali.io/docs/configuration/rbac/
- Grafana Generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Prometheus HTTPS and authentication documentation: https://prometheus.io/docs/prometheus/latest/configuration/https/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#token
- Istio ingress access control documentation: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- OAuth2 Proxy configuration documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/
- Jaeger Operator ingress OAuth proxy documentation: https://www.jaegertracing.io/docs/1.13/operator/

## Issues Found
- Kiali RBAC example used unsupported `role_claim` and `role_mapping` fields under `spec.auth.openid`. Replaced it with Kubernetes RBAC objects, which is how Kiali documents per-user namespace authorization.
- Token-based Kiali example bound the service account to `kiali-viewer`, which is not guaranteed to exist in every Kiali installation. Updated it to bind against the RBAC role shown in the post.
- Prometheus was described as having no built-in authentication. Prometheus supports basic authentication and TLS through web configuration, so the text now clarifies that OAuth2/OIDC login requires an external authentication layer.
- Jaeger section described the OpenShift OAuth proxy example as OIDC. Updated the wording to identify it as OpenShift-specific ingress authentication.
- Istio ingress IP restriction text did not mention the `ipBlocks` vs. `remoteIpBlocks` distinction. Added the official caveat for gateways behind HTTP/HTTPS load balancers using `X-Forwarded-For`.
- Grafana anonymous-auth snippet was marked as YAML even though it is `grafana.ini` syntax. Updated the code fence to `ini`.

## Review Notes
- The OAuth2 Proxy deployment is illustrative and assumes a matching Service or route will be added for real traffic.
- The Jaeger Operator `oauth-proxy` example is platform-specific to OpenShift-era Jaeger Operator deployments; non-OpenShift deployments should use an external proxy or ingress authentication pattern.
