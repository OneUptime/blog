# Validation Summary: How to Implement Approval Workflows for Deployments in ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications and sync policies
- Argo CD AppProjects and sync windows
- Argo CD resource hooks
- Argo CD CLI
- GitHub Actions environment approvals
- Argo Rollouts AnalysisTemplates
- Kubernetes Jobs
- Prometheus metrics

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/resource_hooks/
- Argo CD `argocd app patch` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_patch/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/commands/argocd_app_set/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- GitHub Docs, Reviewing deployments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments
- Argo Rollouts Prometheus analysis documentation: https://argo-rollouts.readthedocs.io/en/release-1.4/analysis/prometheus/

## Issues Found
- The sync window example used an always-active deny window plus an allow window. Argo CD deny windows override allow windows, so automated syncs would not run during the stated maintenance window. Removed the deny window and described the allow-window pattern accurately.
- The GitHub Actions approval example used `argocd app set --annotations`, but the official `argocd app set` command does not provide an `--annotations` flag. Replaced it with `argocd app patch --type merge`.
- The compliance annotation example also used the unsupported `argocd app set --annotations` command. Replaced it with `argocd app patch --type merge`.
- The text claimed live Application annotations are visible in Git history. Corrected this to explain that patched annotations persist on the Application resource, while Git history requires committing the metadata to the repository.
- The PreSync hook used a fixed `metadata.name`. Argo CD named hooks are only created once unless `BeforeHookCreation` is used, so repeated approval checks could fail to rerun. Changed the Job to use `generateName`.
- The webhook example parsed the HTTP status with `tail -c 4` from a combined response body and status code, which can produce incorrect values. Changed the curl command to write the body to a file and capture only `%{http_code}`.

## Review Notes
The Argo CD CLI was not installed in the local environment, so CLI behavior was verified against official Argo CD command reference documentation rather than local `--help` output.
