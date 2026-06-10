# Validation Summary: How to Implement ArgoCD SSO with Dex

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (Argo CD)
- Dex (identity broker / federated OIDC provider)
- Kubernetes (kubectl, ConfigMaps, Secrets, Deployments)
- OIDC / OAuth 2.0
- LDAP / Active Directory
- SAML 2.0
- GitHub OAuth
- Google OIDC / Google Workspace
- ArgoCD RBAC (Casbin-style policy.csv)
- AppProject CRD (argoproj.io/v1alpha1)

## Sources Consulted
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex SAML connector documentation: https://dexidp.io/docs/connectors/saml/
- ArgoCD User Management overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- ArgoCD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- ArgoCD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/

## Issues Found

1. **Invalid `scopes` field in Dex GitHub connector** (Step 2 of "Configuring Dex with GitHub OAuth").
   The original configuration included:
   ```yaml
   scopes:
     - read:org
   ```
   The Dex GitHub connector does not expose a user-configurable `scopes` field — OAuth scopes are managed internally by Dex based on whether `orgs`/`loadAllGroups` are configured. Including this field has no effect and is not documented at https://dexidp.io/docs/connectors/github/.
   **Fix:** Removed the `scopes` block (and its leading comment) from the GitHub connector example.

2. **Non-existent `server.audit.enabled` parameter in `argocd-cmd-params-cm`** (Security Best Practices section 5).
   The original snippet included:
   ```yaml
   server.audit.enabled: "true"
   ```
   This is not a valid ArgoCD command-line parameter — it does not appear in the official `argocd-cmd-params-cm` reference, and ArgoCD does not expose a toggle by that name. The ArgoCD server emits audit-style events through its standard logger.
   **Fix:** Replaced the snippet with valid parameters from the official reference (`server.log.level` and `server.log.format`), keeping the section's intent of enabling structured/observability-friendly logging on the server.

## Review Notes

- The LDAP examples use `{0}` substitution inside `userSearch.filter` and `groupSearch.filter` (e.g., `(|(uid={0})(mail={0})(sAMAccountName={0}))` and `(member={0})`). Current Dex documentation describes the filter as being ANDed with an auto-generated `(username_attr=<entered>)` clause for user search, and group/user matching driven by `userMatchers` for group search — the `{0}` style is not in the current docs. This pattern appears widely in community examples and may still work depending on the Dex version, but readers on newer Dex releases (post v2.39) should follow the official docs and rely on `userMatchers` rather than `{0}` substitution for `groupSearch`. Left as-is because it is a widely circulated style and not flatly incorrect, but worth modernizing in a future revision.
- Dex v2.39+ introduced stricter validation of LDAP credentials (rejecting special characters that could be used for filter injection). Service-account passwords containing characters such as `(`, `)`, `*`, or `\` may need to be rotated before upgrading.
- The post says "ArgoCD includes Dex as its built-in OIDC provider" — accurate for the default ArgoCD installation manifests, which ship an `argocd-dex-server` Deployment. Users who install ArgoCD via Helm with Dex disabled would need to enable it explicitly.
- `policy.default: ""` (used in the "Restrictive default" example) is the correct way to grant no default permissions; ArgoCD treats an empty string as "no role assigned by default."
- The `g, alice@yourdomain.com, role:admin` example assigns the role to the user's email claim — this works because ArgoCD maps the `sub`/`email` claim to the policy subject. Worth noting that the exact identifier depends on the connector's `usernameAttr`/`emailAttr` configuration.
- SAML `redirectURI`, ACS URL, and Entity ID all correctly point to `/api/dex/callback`, which matches how ArgoCD fronts Dex.
