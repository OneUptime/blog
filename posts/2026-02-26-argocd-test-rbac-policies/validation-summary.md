# Validation Summary: How to Test RBAC Policies with argocd admin settings rbac

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD CLI
- Argo CD RBAC
- Kubernetes ConfigMaps
- GitHub Actions
- Bash scripting

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD CLI v3.4.2 `argocd admin settings rbac can --help`
- Argo CD CLI v2.14.10 local command checks for policy validation and RBAC `can` behavior

## Issues Found
- The post said `validate` catches invalid resource types and duplicate rules. Local CLI checks and the official command reference show that `validate` is syntactic policy validation for local CSV or ConfigMap policy input, not semantic duplicate/resource validation. Updated the bullet list to remove those claims.
- The post described "all available actions" but listed only a subset of resource types and actions. Updated the wording to "common actions" to avoid overstating the reference.
- The application action example used the bare `action` action. Argo CD documents resource actions in the `action/<group>/<kind>/<action-name>` format, so the example was changed to `action/apps/Deployment/restart`.
- The debugging example used `-v`, but `argocd admin settings rbac can` does not provide a `-v` shorthand flag. Replaced that command with a plain exact-policy recheck.

## Review Notes
The examples assume an Argo CD CLI version that supports `argocd admin settings rbac can` and `validate`. The CLI returns `Yes` with exit code 0 for allowed checks and `No` with a non-zero exit code for denied checks, which is acceptable for the provided Bash function because command substitution is used without `set -e`.
