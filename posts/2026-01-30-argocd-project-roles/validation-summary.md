# Validation Summary: How to Create ArgoCD Project Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD AppProject resources
- Argo CD RBAC and project roles
- Argo CD CLI
- Kubernetes ConfigMaps and events
- OIDC / SSO group integration
- GitHub Actions

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- Argo CD `argocd proj role list-tokens` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_list-tokens/
- Argo CD `argocd proj role delete-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_delete-token/
- Argo CD `argocd account can-i` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_can-i/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD Security / Auditing documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/

## Issues Found
- The post said the RBAC model had "three key concepts" while listing more than three parts of a policy. Changed the wording to "these key concepts."
- The token deletion command described deleting by token ID. Current Argo CD CLI documentation expects the issued-at value for `argocd proj role delete-token`, so the text and example were updated, and `list-tokens --unixtime` was used to show values suitable for deletion.
- The "Role Hierarchy Example" heading implied project-role inheritance, but the manifest defines separate roles with different permissions. Renamed it to "Role Permission Tiers Example."
- The resource restriction section described AppProject resource allow/deny lists as per-role restrictions. These fields apply at the project level, so the heading and introduction were corrected.
- The resource restriction example listed `ResourceQuota` under `clusterResourceBlacklist`, but `ResourceQuota` is namespace-scoped. Moved it to `namespaceResourceBlacklist` and used a documented cluster-scoped Namespace name blacklist example.
- The post used a non-existent `argocd proj role can-i` command. Replaced it with `argocd account can-i` for current-account checks and `argocd admin settings rbac can` for testing a role or subject.
- The audit logging example set `audit.enabled` in `argocd-cm`, which is not a documented Argo CD configuration key. Replaced it with guidance to use Git history and Argo CD-generated Kubernetes events.

## Review Notes
The examples assume applications live in the Argo CD control-plane namespace, where `<project>/<application>` RBAC object patterns remain valid. Newer Applications-in-any-namespace setups may need namespace-qualified application object patterns.
