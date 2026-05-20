# Validation Summary: How to Fix ArgoCD SSO Redirect URI Mismatch

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Dex
- OpenID Connect (OIDC)
- OAuth 2.0
- Kubernetes ConfigMaps
- kubectl
- Okta, Microsoft Entra ID, Google OAuth, and Keycloak SSO configuration

## Sources Consulted
- Argo CD User Management / SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD Okta SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/okta/
- Argo CD Microsoft Entra ID SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/microsoft/
- Argo CD Google SSO documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/google/
- Argo CD settings package documentation for OIDCConfig fields: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/util/settings
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- OAuth 2.0 RFC 6749 redirect URI matching rules: https://www.rfc-editor.org/rfc/rfc6749
- OpenID Connect Core 1.0 redirect_uri requirements: https://openid.net/specs/openid-connect-core-1_0.html

## Issues Found
- The post initially said the Dex redirect URI uses `/auth/callback`. Argo CD documentation states Dex callbacks use `/api/dex/callback`, while direct OIDC uses `/auth/callback`. Updated the affected examples, IdP instructions, port/path mismatch examples, debug guidance, and summary.
- The direct `oidc.config` example included a `redirectURI` field and claimed it overrides the generated callback. The current Argo CD `OIDCConfig` fields do not include `redirectURI`; Argo CD derives the callback from `url`. Removed the unsupported field and replaced the explanation with guidance to fix `url` and proxy/root path settings.
- The Dex section said two redirect URIs were required, but only the Dex callback URI is required for the IdP in that scenario. Updated the wording to require the matching `/api/dex/callback` URI.
- The restart example always restarted `argocd-dex-server`, which can fail in direct-OIDC deployments without Dex. Updated the command to restart Dex only if the deployment exists.

## Review Notes
The remaining guidance is broadly accurate for current Argo CD SSO behavior. Provider console navigation can change over time, but the redirect URI values and Argo CD callback paths were validated against official Argo CD and protocol documentation.
