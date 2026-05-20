# Validation Summary: How to Grant Deploy Access to Specific Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Kubernetes ConfigMaps
- Argo CD CLI
- GitOps deployment workflows

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/

## Issues Found
- The post used bare `action` permissions for application resource actions. Current Argo CD documentation specifies resource actions as `action/<group>/<kind>/<action-name>`, with `action/*` used to allow all resource actions for an application. Updated RBAC snippets from `action` to `action/*`.
- The post described `override` as a typical deploy permission and as an application parameter override. Argo CD documents `override` as permission to sync local manifests, and in newer configurations optionally different revisions, which can diverge from the configured Git source. Updated the explanation to treat `override` as sensitive and removed it from the safe deployer example.
- The CI example ran `argocd app sync production/api-service`, but the CLI expects application names for `argocd app sync`; `<project>/<application>` is the RBAC object format, not the normal app sync argument. Updated the command to `argocd app sync api-service --auth-token $ARGOCD_TOKEN`.
- The post recommended always using explicit deny rules for delete. Argo CD deny rules are useful when a role might inherit broader permissions, but default-policy permissions cannot be blocked by deny rules. Updated the wording to avoid overstatement.

## Review Notes
- The `<project>/<application>` object format is correct for standard Argo CD application-specific RBAC policies. Installations using "applications in any namespace" use `<project>/<app-namespace>/<app-name>` instead.
