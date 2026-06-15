# Validation Summary: How to Configure SSO with OIDC in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Dex
- OpenID Connect (OIDC)
- OAuth2
- Okta
- Microsoft Entra ID / Azure AD
- Google Workspace
- Keycloak
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC

## Sources Consulted
- Argo CD user management and SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD argocd-cm reference example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm-yaml/
- Argo CD login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD Microsoft SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/microsoft/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex Microsoft connector documentation: https://dexidp.io/docs/connectors/microsoft/
- Dex Google connector documentation: https://dexidp.io/docs/connectors/google/
- Dex OIDC connector source for current config fields: https://github.com/dexidp/dex/blob/master/connector/oidc/oidc.go
- Dex Microsoft connector source for current config fields: https://github.com/dexidp/dex/blob/master/connector/microsoft/microsoft.go
- Dex Google connector source for current config fields: https://github.com/dexidp/dex/blob/master/connector/google/google.go

## Issues Found
- The Okta OIDC connector requested the `groups` scope but did not enable Dex group claim pass-through. Added `insecureEnableGroups: true`, which Dex requires for OIDC group claims.
- The Microsoft connector used `useGroupDisplayName`, which is not a current Dex Microsoft connector field. Replaced it with `groupNameFormat: name`.
- The Google connector listed Google Workspace groups but omitted the required service account delegation fields used by Dex to query Google groups. Added the service account setup note and `serviceAccountFilePath` / `domainToAdminEmail` fields.
- The Keycloak OIDC connector requested the `groups` scope but did not enable Dex group claim pass-through. Added `insecureEnableGroups: true`.
- The break-glass note implied that storing the admin password is sufficient after disabling the admin account. Updated it to include documenting how to re-enable the admin account.
- The CLI section described an SSO login with `--sso-port` as suitable for headless/CI use. Updated it to describe the port as a callback-port override and changed the automation example to use a local `apiKey` account token.
- The TLS custom CA example used `rootCA`, but the Dex OIDC connector field is `rootCAs`. Updated the example to the correct list field.
- The session timeout example used `timeout.session`, which is not the Argo CD user session duration key. Replaced it with `users.session.duration`.

## Review Notes
- The post uses the older product name "Azure AD"; Microsoft now uses "Microsoft Entra ID", but the surrounding Argo CD and Dex documentation still commonly references Microsoft/Azure terminology, so this was left as-is.
- The post configures SSO through Argo CD's bundled Dex. Argo CD also supports direct `oidc.config` integration with an existing OIDC provider, which uses `/auth/callback` instead of `/api/dex/callback`; that alternative is outside the scope of this post.
