# Validation Summary: How to Create Custom RBAC Roles in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Casbin policy CSV
- Kubernetes ConfigMaps
- OIDC / SSO group mapping
- Argo CD CLI

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD user management / OIDC configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC package constants: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/util/rbac

## Issues Found
- The resource list omitted current Argo CD RBAC resources such as `applicationsets`, `projects`, `write-repositories`, and `extensions`. Updated the list to match the official RBAC documentation and Argo CD RBAC constants.
- The action list and examples used plain `action` for application resource actions without explaining the path format. Official Argo CD documentation uses `action/<group>/<kind>/<action-name>` and `action/*` for all resource actions, so the examples were updated to `action/*` and the action description was clarified.
- The operations viewer role claimed users "should not change anything" while granting `exec, create`, which allows terminal access into Pods. Updated the heading and description to describe log and terminal access accurately.
- The multiple-role explanation said access is allowed if any role permits it, without mentioning deny precedence. Updated the sentence to note that matching deny rules still take precedence.
- The deny-rule example comment said it allowed sync, but the policy used the wildcard action `*`, which allows all application actions until denied. Updated the comment to match the policy.
- The SSO section said to configure the group claim in `argocd-cm`. Updated the wording to clarify that `argocd-cm` requests the groups scope, while RBAC matching uses group claims from the configured scopes.

## Review Notes
The local `argocd` CLI was not installed in the review environment, so CLI behavior was checked against official Argo CD command documentation rather than local `--help` output.
