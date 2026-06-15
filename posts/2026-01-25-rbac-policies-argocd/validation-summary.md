# Validation Summary: How to Configure RBAC Policies in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD RBAC
- Casbin policy syntax
- Kubernetes ConfigMaps
- Argo CD AppProjects
- Argo CD CLI
- OIDC / SSO group mapping

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD argocd-rbac-cm.yaml example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-rbac-cm-yaml/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD built-in RBAC policy source: https://raw.githubusercontent.com/argoproj/argo-cd/stable/assets/builtin-policy.csv

## Issues Found
- The built-in role examples were incomplete for current Argo CD. Added `applicationsets` and `write-repositories` to `role:readonly`, expanded `role:admin` to the current built-in policy actions, and included `g, role:admin, role:readonly` because admin inherits readonly permissions.
- The basic ConfigMap example used `g, *, role:readonly` to represent default authenticated access. Removed it because Argo CD documents `policy.default` as the supported default role mechanism for authenticated users.
- The deny examples incorrectly showed wildcard deny rules followed by allow exceptions. Argo CD gives any matching `deny` priority over matching `allow`, so those exceptions would not work. Rewrote the examples to deny a specific role and added a warning about wildcard denies.
- The deny example referenced `role:authenticated` without assigning it. Added `policy.default: role:authenticated` so the "Everyone can view" policy is actually applied to authenticated users.

## Review Notes
The post is technically relevant and useful. Future updates could mention Argo CD's `policy.matchMode` option and application-in-any-namespace object format, but those are optional details rather than correctness issues for this guide.
