# Validation Summary: How to Understand ArgoCD's Built-in Roles: admin and readonly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Casbin policy syntax
- Kubernetes ConfigMaps
- Argo CD CLI

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD built-in RBAC policy: https://github.com/argoproj/argo-cd/blob/master/assets/builtin-policy.csv
- Argo CD CLI `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD User Management overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/

## Issues Found
- The admin role policy snippet was outdated and oversimplified. It used wildcard actions for several resources and omitted current built-in resources/actions such as `applicationsets`, `write-repositories`, fine-grained application update/delete actions, `override`, and `action/*`. Updated the snippet to match the current official built-in policy.
- The readonly role policy snippet was incomplete. It omitted `applicationsets`, `write-repositories`, and `projects`, and used `*` instead of the application-specific `*/*` object format for `logs`. Updated the snippet to match the current official built-in policy.
- The post incorrectly said built-in roles do not inherit from each other. Current Argo CD built-in policy includes `g, role:admin, role:readonly`, so `role:admin` inherits `role:readonly`. Updated the security consideration and nearby explanation.
- The admin capability list implied that Argo CD RBAC itself grants management of RBAC policies and all API endpoints. Reworded this to local account management and Argo CD RBAC-protected operations to avoid overstating what the role grants.
- The policy snippets were marked as YAML even though they are Casbin CSV policy lines. Updated those code fences to `csv`.

## Review Notes
The CLI examples and Kubernetes ConfigMap snippets are consistent with the official Argo CD command reference and RBAC documentation. The local environment did not have the `argocd` CLI installed, so CLI verification was performed against the official command reference rather than local `--help` output.
