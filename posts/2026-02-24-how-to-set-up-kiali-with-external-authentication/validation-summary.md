# Validation Summary: How to Set Up Kiali with External Authentication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kiali
- Istio service mesh
- Kubernetes RBAC
- Kubernetes service account tokens
- OpenID Connect (OIDC)
- OpenShift OAuth
- OAuth2 Proxy

## Sources Consulted
- Kiali authentication strategies: https://kiali.io/docs/configuration/authentication/
- Kiali OpenID Connect strategy: https://kiali.io/docs/configuration/authentication/openid/
- Kiali header strategy: https://kiali.io/docs/configuration/authentication/header/
- Kiali token strategy: https://kiali.io/docs/configuration/authentication/token/
- Kiali namespace access control: https://kiali.io/docs/configuration/rbac/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali accessing Kiali / public route settings: https://kiali.io/docs/installation/installation-guide/accessing-kiali/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- OAuth2 Proxy configuration overview: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/

## Issues Found
- The post described Kiali defaults as anonymous or a basic login token. Current Kiali defaults are OpenShift OAuth on OpenShift and token authentication on other Kubernetes clusters, so the introduction was corrected.
- The OIDC secret example used `kiali-oidc`, but Kiali's default deployment secret name is `kiali` unless `spec.deployment.secret_name` is changed. The secret command now creates `kiali`.
- The OIDC RBAC example did not explain that namespace access control requires the Kubernetes API server to trust the same OIDC issuer and matching client configuration. A short prerequisite note was added.
- The Kiali CR example used deprecated `deployment.accessible_namespaces`. It was replaced with current `deployment.cluster_wide_access`.
- The `server.web_port` example used an integer, while the current Kiali CR schema defines it as a string. It is now quoted.
- The token RBAC example bound a `kiali-viewer` ClusterRole that is not the current Kiali namespace authorization pattern. It now creates and binds the documented `kiali-namespace-authorization` ClusterRole.
- The header-auth example configured a non-existent `auth.header.name` field and claimed Kiali trusts `X-Auth-Request-User`. Current Kiali header auth expects an `Authorization: Bearer TOKEN` header, or Kubernetes impersonation headers with an authorized bearer token. The Kiali CR and explanation were corrected.
- The OAuth2 Proxy example did not pass an Authorization bearer token to Kiali and omitted the cookie secret. It now uses `--pass-authorization-header=true` and references a `cookie-secret`.
- The RBAC explanation overstated resource-level filtering and impersonation behavior. It now describes Kiali namespace access control and notes that write operations still require Kubernetes RBAC permissions.

## Review Notes
- The OAuth2 Proxy example assumes the OIDC token passed upstream is accepted by the Kubernetes API server, which requires matching cluster OIDC configuration. In environments where that is not true, use Kiali's `openid` strategy without RBAC (`disable_rbac: true`) or configure a proxy that supplies valid Kubernetes impersonation headers with an authorized token.
