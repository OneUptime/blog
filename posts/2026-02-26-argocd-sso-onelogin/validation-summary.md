# Validation Summary: How to Configure SSO with OneLogin in ArgoCD

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Argo CD
- OneLogin
- OpenID Connect (OIDC)
- Dex
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC
- Argo CD CLI
- JSON Web Tokens (JWT)

## Sources Consulted
- Argo CD OneLogin user management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/onelogin/
- Argo CD SSO and OIDC user management documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD argocd-rbac-cm example: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/argocd-rbac-cm-yaml/
- Argo CD CLI `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD CLI `argocd account get-user-info` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_get-user-info/
- OneLogin OpenID Connect scopes documentation: https://developers.onelogin.com/openid-connect/scopes
- OneLogin OpenID Connect custom connector documentation: https://onelogin.service-now.com/kb?id=kb_article_view&sysparm_article=KB0010435
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- RFC 7519 JSON Web Token specification: https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- The OneLogin Login URL was set to `/auth/callback`. Changed it to `/auth/login`, because Argo CD's OneLogin documentation uses `/auth/login` as the app launch URL and `/auth/callback` as the redirect URL.
- The OneLogin token endpoint authentication method was listed as POST. Changed it to Basic to match Argo CD's OneLogin setup guidance.
- The groups-claim instructions referenced SAML assertion settings and an alternate custom-claims flow that does not match the OIDC app flow documented for Argo CD. Replaced this with OneLogin's OIDC Groups parameter mapping using User Roles and Semicolon Delimited Input.
- The Dex OIDC example requested the `groups` scope but did not enable `insecureEnableGroups`. Added `insecureEnableGroups: true`, which Dex requires for group claims through the OIDC connector.
- The JWT decode command used regular base64 decoding on a JWT payload. Replaced it with a Python base64url decoding example, since JWT parts are base64url-encoded.
- The security best-practice section suggested OneLogin provisioning could automatically create and deactivate Argo CD user access. Reworded it to app assignments and mappings, which better matches Argo CD's SSO/RBAC access model.

## Review Notes
- The Argo CD OIDC and RBAC snippets use current documented keys and policy syntax.
- The Argo CD CLI commands `argocd login SERVER --sso` and `argocd account get-user-info` are current.
- The direct OIDC callback URL `/auth/callback` and Dex callback URL `/api/dex/callback` match Argo CD documentation.
