# Validation Summary: How to Set Up OAuth2 Proxy with Istio Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio ingress gateway
- Istio external authorization and AuthorizationPolicy
- OAuth2 Proxy
- Kubernetes Deployments, Services, and Secrets
- Google OAuth, GitHub OAuth, and Keycloak OIDC
- Python Flask request headers

## Sources Consulted
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- OAuth2 Proxy configuration overview: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/
- OAuth2 Proxy Google provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/google/
- OAuth2 Proxy GitHub provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/github/
- OAuth2 Proxy Keycloak OIDC provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/keycloak_oidc/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-secret-generic-em-
- OAuth2 Proxy releases: https://github.com/oauth2-proxy/oauth2-proxy/releases

## Issues Found
- The Istio extension provider examples used `envoyExtAuthz`, which is not the current MeshConfig field for an HTTP external authorizer. Changed it to `envoyExtAuthzHttp`.
- The ext_authz examples did not forward `set-cookie` headers back to downstream clients on allowed auth checks. Added `headersToDownstreamOnAllow` with `set-cookie`, matching Istio's OAuth2 Proxy example.
- The ConfigMap example omitted `x-auth-request-access-token` even though the main example enables `--pass-access-token=true`. Added the header for consistency.
- The post mixed `x-forwarded-*` and `x-auth-request-*` header behavior without distinguishing proxy mode from external authorization mode. Clarified the introductory wording.
- The OAuth2 Proxy image tag was `v7.6.0`, while the current release reviewed was `v7.15.2`. Updated the example image to `v7.15.2`.
- The Istio AuthorizationPolicy, Gateway, and VirtualService snippets used older `v1beta1` API versions. Updated them to the current stable `security.istio.io/v1` and `networking.istio.io/v1` API versions.
- The access-token header description implied the header is always present. Clarified that `x-auth-request-access-token` is emitted when `--pass-access-token=true` is enabled.

## Review Notes
The YAML snippets were parsed locally after editing. Local `kubectl` was not installed, so the Kubernetes command was verified against the official kubectl reference rather than local `--help` output.
