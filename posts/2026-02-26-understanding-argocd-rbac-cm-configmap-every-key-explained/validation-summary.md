# Validation Summary: Understanding ArgoCD argocd-rbac-cm ConfigMap: Every Key Explained

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Casbin-style RBAC policies
- OIDC scopes
- Argo CD CLI

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD argocd-rbac-cm.yaml example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-rbac-cm-yaml/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/

## Issues Found
- The post said the ConfigMap had "three main keys" while listing four keys and omitting the supported `policy.<name>.csv` composition key. Updated the wording to "commonly used keys" and added `policy.overlay.csv` plus a short example of additional policy files.
- The `policy.default` description called the default role a fallback only. Argo CD grants the default role to authenticated users before evaluating user-specific and group-specific policies, and default-policy permissions cannot be blocked by `deny`. Updated the explanation accordingly.
- The application action list included `list`, and an example granted `applications, list`. Current Argo CD RBAC documentation lists `get`, `create`, `update`, `delete`, `sync`, `override`, and `action` for applications, not `list`. Removed the invalid `list` policy and action entry.
- The policy subject description implied direct group policies are generally valid. Argo CD documentation notes groups should be assigned to roles with `g` lines for policies to work. Updated the subject description to emphasize users or roles and group-to-role mappings.
- The `policy.matchMode` section described regex mode as "slower" without support in official documentation. Removed that unsupported performance claim and added the documented glob behavior that `/` is not treated as a separator.

## Review Notes
The Argo CD CLI was not installed in the local environment, so CLI syntax was checked against the official command reference instead of local `--help` output.
