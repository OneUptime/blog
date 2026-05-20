# Validation Summary: How to Use Selective Sync in CI/CD Pipelines with ArgoCD

## Status
validated

## Post Type
Tutorial / CI/CD integration guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Argo CD REST API
- Bash, jq, Python requests

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_create-token/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Argo CD OpenAPI schema: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json

## Issues Found
- `argocd app resources --output json` is not supported by the current Argo CD command reference; `argocd app resources` only documents tree outputs. Replaced these usages with `argocd app get --output json` and `.status.resources[]`, which is the supported JSON source for resource sync status.
- The staged rollout snippets filtered resources by namespace but built selectors without the namespace, which could select same-named resources in other namespaces. Updated the selectors to use `GROUP:KIND:NAMESPACE/NAME`.
- The automatic detection section claimed it synced changed resources, but the script actually syncs resources that Argo CD reports as out of sync after manifest changes. Adjusted the wording and snippet comment to match the implementation.
- `argocd app diff --resource` is not a documented option for `argocd app diff`. Changed the safety check to preview the application diff without a resource selector.
- The safety check described `.status.sync.status` as a sync-window check, but that field is the application sync status. Updated the comment and variable name accordingly.

## Review Notes
The Argo CD CLI examples use current resource selector formats, token generation commands, token authentication flag, and API sync payload fields. The linked OneUptime reference URLs returned HTTP 200 during review.
