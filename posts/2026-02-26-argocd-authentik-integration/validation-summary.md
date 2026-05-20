# Validation Summary: How to Integrate ArgoCD with Authentik

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD
- Authentik
- Dex
- OpenID Connect / OAuth 2.0
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC
- Helm charts
- Python expression policies

## Sources Consulted
- Authentik Argo CD integration guide: https://docs.goauthentik.io/integrations/services/argocd/
- Authentik OAuth2/OIDC provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Authentik provider property mappings documentation: https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/
- Authentik expression policies documentation: https://docs.goauthentik.io/customize/policies/expression
- Authentik 2026.2 release notes: https://docs.goauthentik.io/releases/2026.2
- Authentik Kubernetes installation documentation: https://docs.goauthentik.io/docs/install-config/install/kubernetes
- Authentik Helm chart values: https://github.com/goauthentik/helm/blob/main/charts/authentik/values.yaml
- Argo CD user management and SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex OIDC connector source schema: https://github.com/dexidp/dex/blob/master/connector/oidc/oidc.go

## Issues Found
- The Authentik group scope mapping used `request.user.ak_groups.all()`. Authentik 2026.2 deprecates `User.ak_groups` in favor of `User.groups`, so the expression was updated to `request.user.groups.all()` to avoid configuration warning events on current Authentik releases.
- The Dex OIDC connector example included `groupsKey: groups` and `emailKey: email` as top-level connector fields. Dex's OIDC connector schema does not define those top-level fields; group and email claim remapping belongs under `claimMapping` and is unnecessary for the default `groups` and `email` claim names. These lines were removed.
- The IP-based Authentik expression policy read `REMOTE_ADDR` directly from the Django request metadata. Authentik exposes the resolved client address as `ak_client_ip`, and its expression policy docs use that helper for IP comparisons, so the example now uses `ak_client_ip`.
- The troubleshooting token test used the OAuth2 `client_credentials` grant to check user group claims. That grant represents a machine-to-machine client, not an interactive user login, so it is not a valid way to verify user group claims. The command was replaced with a JWT payload decoding example for an ID token from a real Argo CD SSO login.

## Review Notes
The post remains technically relevant and aligns with the official Authentik Argo CD integration pattern of using Argo CD's bundled Dex connector. The embedded Authentik Helm chart example uses `targetRevision: 2024.8.3`, which is an older chart/app version; it is still a valid version-specific example, but future updates should consider refreshing it to a supported Authentik release.
