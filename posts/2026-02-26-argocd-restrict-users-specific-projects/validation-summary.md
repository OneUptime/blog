# Validation Summary: How to Restrict Users to Specific Projects in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Casbin policy syntax
- Kubernetes ConfigMaps
- Argo CD AppProjects
- OIDC/SAML SSO group mapping

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Microsoft / Entra ID documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/microsoft/
- Linked OneUptime RBAC guide: https://oneuptime.com/blog/post/2026-01-25-rbac-policies-argocd/view

## Issues Found
- The RBAC resource and action lists were incomplete for current Argo CD. I updated the resource list to include `applicationsets`, `accounts`, `certificates`, `gpgkeys`, and `extensions`, and clarified that valid actions depend on the resource.
- The object description implied every RBAC resource uses the `<project>/<application>` pattern. I clarified that this is specifically the pattern for application-specific resources such as `applications`, `logs`, and `exec`.
- The `policy.default` description implied it directly controls all unauthenticated users. I clarified that it applies to authenticated users by default and to unauthenticated users only when anonymous access is enabled.
- The project-level roles description implied AppProject roles generate JWT tokens automatically. I changed it to say project roles can be used with generated JWT tokens for automation.
- The RBAC testing commands used `argocd admin rbac ...`, which is not the current documented command path. I changed them to `argocd admin settings rbac can ...` and `argocd admin settings rbac validate ...`.
- The `can` command examples did not include a policy source. I added `--policy-file policy.csv` to make the examples match the surrounding instruction to test a local policy.

## Review Notes
The Argo CD CLI was not installed in the local environment, so command validation was performed against the official Argo CD command reference. The post does not pin an Argo CD version; the review used the stable/latest official documentation available on 2026-05-20.
