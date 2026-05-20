# Validation Summary: How to Configure SSO with Auth0 in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Auth0
- OpenID Connect
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC
- kubectl
- JavaScript Auth0 Actions and Rules

## Sources Consulted
- Argo CD User Management / Existing OIDC Provider documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD Auth0 integration documentation: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/user-management/auth0/
- Argo CD RBAC Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Auth0 Actions post-login event object documentation: https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/login-trigger/post-login-event-object
- Auth0 Actions post-login API object documentation: https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/login-trigger/post-login-api-object
- Auth0 custom claims documentation: https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims
- Auth0 Rules and Hooks lifecycle documentation: https://auth0.com/docs/customize/hooks
- Auth0 Organizations token documentation: https://auth0.com/docs/manage-users/organizations/using-tokens
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl patch command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The Auth0 concepts section described an Auth0 API as if it were required for this OIDC login flow. Auth0 APIs are resource servers for API permissions/scopes and are optional for this Argo CD SSO setup, so I clarified that wording.
- The `requestedIDTokenClaims` YAML examples used an unquoted URL claim key. YAML can often parse that key, but quoting custom claim URI keys is safer and avoids parser ambiguity, so I quoted the namespaced claim in both examples.
- The Auth0 Organizations section repeated the base OIDC configuration and implied that this alone configured organization-aware isolation. Auth0 Organizations issue an `org_id` claim when organization login is used, and Auth0 recommends validating that organization claim. I replaced the repeated OIDC block with an Argo CD RBAC example that includes `org_id` in `scopes` and added text explaining that the Auth0 application must be configured for Organizations and that `org_id` should be validated in RBAC or access should be restricted in Auth0.

## Review Notes
- The Auth0 Action syntax using `exports.onExecutePostLogin`, `event.authorization.roles`, and `api.idToken.setCustomClaim` / `api.accessToken.setCustomClaim` matches current Auth0 Actions documentation.
- The legacy Rule example remains syntactically valid for existing tenants with Rules enabled, but Auth0 Rules and Hooks are deprecated, unavailable to new tenants created after October 16, 2023, and scheduled for end of life on November 18, 2026.
- The Argo CD OIDC keys (`oidc.config`, `issuer`, `clientID`, `clientSecret`, `requestedScopes`, and `requestedIDTokenClaims`) and RBAC `scopes` usage match current Argo CD documentation.
- I could not run `kubectl --help` locally because `kubectl` is not installed in this workspace, so the command review was performed against the official Kubernetes command reference.
