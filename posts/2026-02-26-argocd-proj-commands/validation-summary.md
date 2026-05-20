# Validation Summary: How to Use argocd proj Commands for Project Management

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- GitOps
- Kubernetes AppProject resources
- Kubernetes RBAC resource kinds
- Project roles and JWT tokens
- Sync windows
- Orphaned resource monitoring
- Bash and jq

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Orphaned Resources Monitoring documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/
- Argo CD `argocd proj create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_create/
- Argo CD `argocd proj list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_list/
- Argo CD `argocd proj get` command reference: https://argo-cd.readthedocs.io/en/release-2.0/user-guide/commands/argocd_proj_get/
- Argo CD `argocd proj add-source` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_proj_add-source/
- Argo CD `argocd proj add-destination` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_add-destination/
- Argo CD `argocd proj remove-destination` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_remove-destination/
- Argo CD resource allow/deny command references: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_allow-cluster-resource/, https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_deny-cluster-resource/, https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_deny-namespace-resource/
- Argo CD project role policy and token command references: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_add-policy/, https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/, https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_delete-token/
- Argo CD sync window command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_windows_add/

## Issues Found
- The example for adding a destination by cluster name omitted the required `--name` flag. Updated `argocd proj add-destination my-project production-cluster my-namespace` to include `--name`, matching the current command reference.
- The example for creating a project role token with a specific identifier used `--token-id`, which is not the current Argo CD CLI flag. Updated it to `--id ci-pipeline-token`, matching the current `argocd proj role create-token` command reference.

## Review Notes
The remaining commands and explanations match the current Argo CD command references and project documentation. The post uses example repository and cluster URLs, which are clearly illustrative placeholders.
