# Validation Summary: How to Configure Project-Level RBAC in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- AppProject resources
- Argo CD RBAC
- Argo CD CLI
- Kubernetes custom resources
- JWT tokens
- SSO group bindings

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- Argo CD `argocd proj role list-tokens` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_list-tokens/
- Argo CD `argocd proj role delete-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_delete-token/
- Argo CD `argocd proj role add-policy` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_proj_role_add-policy/
- Argo CD `argocd proj role remove-policy` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_remove-policy/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/

## Issues Found
- The token creation example used `--token-id`, but the current Argo CD CLI option is `--id`. Changed the command to `argocd proj role create-token frontend deployer --id ci-pipeline-token`.
- The token management text said the `iat` timestamp serves as the token identifier. Current command output includes a token ID, while `delete-token` still takes the issued-at value. Clarified that `iat` is used by the delete command.
- The section on combining global and project RBAC incorrectly described authorization as a strict two-layer model where both global RBAC and project RBAC must allow the action. Updated it to describe AppProject role policies as part of Argo CD RBAC evaluation, with matching deny policies taking priority.
- The global/project RBAC example used `g, *, role:authenticated`, which is not a reliable way to bind all authenticated users in Argo CD RBAC. Replaced it with an explicit group-to-role binding.
- The comparison table said project RBAC cannot manage clusters or repositories. Argo CD supports project-scoped repositories and clusters through project role policies, so the table and explanatory text were corrected to distinguish project-scoped resources from global administration.
- The comparison table referred broadly to JWT token generation. Clarified this row as project role JWT tokens to avoid implying that Argo CD has no other token mechanisms.

## Review Notes
The AppProject role YAML examples, SSO group bindings, application/log/exec policy formats, and RBAC testing command syntax are consistent with the current Argo CD documentation. The post does not pin an Argo CD version, so this review used the stable/latest official documentation available on 2026-05-20.
