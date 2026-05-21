# Validation Summary: How to Set Up Kiali Authentication Methods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kiali
- Istio
- Kubernetes RBAC
- Kubernetes service account tokens
- OpenID Connect
- OAuth2 Proxy
- Keycloak
- Google OIDC
- Okta

## Sources Consulted
- Kiali authentication strategies: https://kiali.io/docs/configuration/authentication/
- Kiali token strategy: https://kiali.io/docs/configuration/authentication/token/
- Kiali OpenID Connect strategy: https://kiali.io/docs/configuration/authentication/openid/
- Kiali header strategy: https://kiali.io/docs/configuration/authentication/header/
- Kiali CR/configuration reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Istio Kiali integration docs: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio `istioctl dashboard kiali` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes `kubectl create token` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes service account administration: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- OAuth2 Proxy configuration reference: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/

## Issues Found
- The token-auth RBAC example used the ClusterRole name `kiali-viewer`, which conflicts with the ClusterRole already created by Istio's Kiali sample manifest. Changed it to `kiali-user-viewer` and updated the binding to match.
- The OIDC secret example created a custom `kiali-oidc` secret and referenced it with `client_secret: oidcSecret:kiali-oidc:oidc-secret`. Kiali's documented setup expects the OIDC secret in the `oidc-secret` key of the mounted `kiali` secret for this style of deployment. Changed the secret name to `kiali` and removed the unsupported secret-reference syntax from the ConfigMap snippet.
- The header-auth example configured `header_name: X-Forwarded-User`, but Kiali's header strategy has no `header_name` option and expects an `Authorization: Bearer` token from the reverse proxy. Removed the invalid header config and updated the OAuth2 Proxy example to pass the authorization header.
- The namespace access section said the restriction applied regardless of authentication method, but Kiali documentation says anonymous mode does not support per-user namespace access control. Reworded it to authenticated methods that support namespace access control.

## Review Notes
- The Istio sample Kiali manifest is intended for demonstration and is not tuned for production security. The post's authentication changes are useful, but production users should prefer a maintained Kiali installation method and rotate the default signing key when enabling authenticated strategies.
- `kubectl create token --duration=8760h` is syntactically valid, but Kubernetes may issue a shorter token depending on API server configuration.
