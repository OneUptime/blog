# Validation Summary: How to Implement Least-Privilege RBAC in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD RBAC
- Argo CD local accounts and API tokens
- Argo CD CLI
- Kubernetes ConfigMaps
- GitOps access control

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD local users/accounts documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/

## Issues Found
- The post originally said `policy.default: ""` makes unauthenticated users get nothing. Argo CD applies `policy.default` to authenticated users by default; unauthenticated users only receive that default role when anonymous access is enabled. Updated the wording to reflect the official RBAC behavior.
- The role examples used `applications, action` to grant resource actions. Argo CD action permissions use the `action/<group>/<kind>/<action-name>` form, and `action/*` is the documented wildcard form for all actions. Updated those policies to `applications, action/*`.
- The emergency-admin example created an API-token-capable account but did not grant that local account elevated RBAC permissions. Added a temporary `policy.emergency.csv` patch granting emergency permissions and noted that it should be removed after the incident.

## Review Notes
The local `argocd` CLI was not installed in the review environment, so CLI behavior was checked against official command references rather than local `--help` output. The post uses global RBAC examples; in a production setup, AppProject roles can further constrain access and may be preferable for team-owned project permissions.
