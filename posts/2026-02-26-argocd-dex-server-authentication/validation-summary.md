# Validation Summary: How ArgoCD Dex Server Handles Authentication

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Dex
- OpenID Connect
- OAuth2
- Kubernetes ConfigMaps, Secrets, Deployments, and Services
- GitHub OAuth
- LDAP / Active Directory
- Okta
- Microsoft Entra ID
- Argo CD RBAC

## Sources Consulted
- Argo CD user management and SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex Microsoft connector documentation: https://dexidp.io/docs/connectors/microsoft/
- Dex storage documentation: https://dexidp.io/docs/configuration/storage/

## Issues Found
- The authentication flow incorrectly said Dex redirects back to ArgoCD with an OIDC token and the browser presents that token to ArgoCD. Updated the flow and sequence diagram to describe the authorization-code callback and server-side token exchange between ArgoCD and Dex.
- The post stated Dex does not store users or passwords itself. Dex has a local connector, so this was narrowed to typical ArgoCD SSO setups where Dex delegates authentication to upstream providers.
- The LDAP group claim wording implied LDAP groups are always included. Updated it to note that group claims are passed through when the `groups` scope is requested.
- The Dex service port note omitted the current metrics port exposed by the Argo CD stable manifest. Updated it to include port 5558.

## Review Notes
The configuration snippets align with current Argo CD and Dex documentation. For OIDC providers such as Okta, group behavior can still depend on provider-side authorization server and claim configuration, so production setups should verify the exact claims returned by the provider.
