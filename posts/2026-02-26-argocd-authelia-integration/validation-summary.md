# Validation Summary: How to Integrate ArgoCD with Authelia

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD
- Dex
- Authelia
- OpenID Connect
- Kubernetes
- Helm
- Argo CD RBAC

## Sources Consulted
- Authelia OpenID Connect provider configuration: https://www.authelia.com/configuration/identity-providers/openid-connect/provider/
- Authelia OpenID Connect client configuration: https://www.authelia.com/configuration/identity-providers/openid-connect/clients/
- Authelia Argo CD OIDC integration guide: https://www.authelia.com/integration/openid-connect/clients/argocd/
- Authelia Helm chart documentation: https://www.authelia.com/integration/kubernetes/chart/
- Authelia Helm chart repository: https://charts.authelia.com/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Argo CD user management and SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/

## Issues Found
- The Authelia OIDC provider snippet used deprecated `issuer_private_key`; replaced it with the current `jwks` issuer signing key configuration.
- The Authelia OIDC client snippet used outdated client fields (`id`, `description`, `secret`) and an incorrect userinfo signing key; replaced them with current fields such as `client_id`, `client_name`, `client_secret`, and `userinfo_signed_response_alg`.
- The client secret generation command omitted the recommended RFC3986 random charset; added `--random.charset rfc3986`.
- The guide used Authelia `access_control` rules for OIDC authorization. Authelia documents that OIDC authorization policies are distinct from reverse-proxy access control, so the section was changed to `identity_providers.oidc.authorization_policies`.
- The Dex connector example used unsupported `groupsKey` and `emailKey` fields. Removed those fields and added `getUserInfo: true` alongside `insecureEnableGroups: true` for group claims returned by the UserInfo endpoint.
- The Helm example referenced the older Authelia chart `0.9.x` and older top-level domain/ingress values. Updated it to `0.11.x` and current chart values using `configMap.session.cookies`.
- The troubleshooting text still referred to `issuer_private_key`; updated it to reference the `jwks` signing key.

## Review Notes
The guide remains centered on Argo CD's bundled Dex flow. Authelia's official Argo CD integration documentation also shows a direct `oidc.config` option using Argo CD's `/auth/callback`; this post's Dex-based approach is still valid when the Authelia client redirect URI is registered as `/api/dex/callback`.
