# Validation Summary: How to Rotate Git Repository Credentials in ArgoCD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD repository and repository credential Secrets
- Argo CD CLI
- Kubernetes Secrets
- Kubernetes CronJobs
- External Secrets Operator
- GitHub personal access tokens, deploy keys, and GitHub App credentials

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repocreds add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repocreds_add/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- Kubernetes Secret documentation: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Referenced OneUptime blog URL: https://oneuptime.com/blog/post/2026-01-25-gitops-argocd-kubernetes/view

## Issues Found
- The verification sync used `argocd app sync my-app --force`. In Argo CD, `--force` means force apply, not simply "force a credential test"; I changed it to `argocd app sync my-app`.
- The command checking for non-healthy applications used `grep -v "Healthy.*Synced"`, but Argo CD wide list output commonly shows sync status before health status. I changed it to `grep -v "Synced.*Healthy"` so healthy synced rows are filtered as intended.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Current official documentation uses the GA `external-secrets.io/v1` API, so I updated the example to `apiVersion: external-secrets.io/v1`.

## Review Notes
The Argo CD repository Secret labels, `repo-creds` credential templates, credential field names, `argocd repo add --upsert`, `argocd repocreds add --upsert`, Kubernetes Secret `stringData`, and CronJob `batch/v1` usage were consistent with official documentation. The CronJob example remains intentionally provider-specific and assumes the named ServiceAccount has RBAC permission to patch the target Secret.
