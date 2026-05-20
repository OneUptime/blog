# Validation Summary: How to Configure SSO with Okta in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Okta
- OpenID Connect
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD User Management / Existing OIDC Provider documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd account get-user-info` command reference: https://argo-cd.readthedocs.io/en/release-2.1/user-guide/commands/argocd_account_get-user-info/
- Okta Developer guide, customize tokens returned from Okta with a groups claim: https://developer.okta.com/docs/guides/customize-tokens-groups-claim/main/

## Issues Found
- The Okta groups-claim instructions for the issuer `https://your-org.okta.com` incorrectly pointed users to **Security > API > Authorization Servers**. Okta's current documentation configures groups claims for the org authorization server on the OIDC application's **Sign On** tab. I changed Option A to use the OIDC application Sign On settings.
- The custom authorization server example did not make the issuer distinction clear. I clarified that `default` under **Security > API > Authorization Servers** is a custom authorization server and added the `https://your-org.okta.com/oauth2/default` issuer example.
- The PKCE troubleshooting section only showed the Argo CD config flag. Argo CD documentation also requires the identity provider to support PKCE and have the PKCE callback URI registered, so I added that prerequisite.

## Review Notes
- The Argo CD OIDC keys (`oidc.config`, `clientSecret`, `requestedScopes`, `requestedIDTokenClaims`, and `enablePKCEAuthentication`) match current Argo CD documentation.
- The Argo CD RBAC examples use valid `policy.csv` and `scopes: '[groups]'` syntax. Note that Argo CD grants every authenticated user at least the permissions in `policy.default`, so production installations may want a more restrictive default role than `role:readonly`.
- The `argocd login argocd.example.com --sso` and `argocd account get-user-info` commands match official CLI documentation.
