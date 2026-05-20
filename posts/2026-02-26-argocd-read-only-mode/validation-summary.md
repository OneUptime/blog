# Validation Summary: How to Run ArgoCD in Read-Only Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Argo CD CLI
- Kubernetes RBAC
- Kubernetes ConfigMaps
- API tokens

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/rbac/
- Argo CD `argocd account can-i` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_can-i/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD user management and local accounts: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/user-management/
- Argo CD Core documentation: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/core/
- Argo CD `argocd-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD declarative setup resource exclusions: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd-cm.yaml` example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD built-in RBAC policy source: https://raw.githubusercontent.com/argoproj/argo-cd/release-2.13/assets/builtin-policy.csv

## Issues Found
- The RBAC validation example used `argocd admin settings rbac validate --subject role:frontend-viewer`, but the official `validate` command only validates policy syntax and does not support a `--subject` flag. Removed the invalid flag and added `argocd admin settings rbac can` examples for role-specific permission checks.
- The `argocd account can-i` examples used `*/*` where the current official command reference demonstrates `*` for checking any application. Updated the examples to use `*`.
- The custom global viewer role was labeled as read-only access to everything, but it only covered a subset of Argo CD resources. Changed the comment to say it grants read-only access to common Argo CD resources.
- The Core mode section described running a separate unauthenticated API server and pairing it with Argo CD RBAC. Argo CD Core does not provide the Argo CD API server or Argo CD RBAC; it relies on Kubernetes RBAC. Replaced the example with Kubernetes `Role` and `RoleBinding` resources and showed CLI core-mode usage.
- The sensitive information section used `oidc.config` as if it hid repository credentials. `oidc.config` configures OIDC authentication and is not a UI redaction mechanism. Replaced that example with `resource.exclusions`, and clarified that this excludes resource kinds from Argo CD discovery and sync.

## Review Notes
- The `resource.exclusions` example is technically valid, but excluding Secrets means Argo CD will not track or sync those Secret resources. Teams should consider the operational impact before using that setting broadly.
- The local `argocd` CLI was not installed in the review environment, so CLI validation was performed against the official Argo CD command reference rather than local `--help` output.
