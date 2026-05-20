# Validation Summary: How to Implement Automated Rollback on Verification Failure in ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD resource hooks and sync waves
- Argo CD RBAC and local accounts
- Argo CD CLI and API
- Kubernetes Jobs, Deployments, ServiceAccounts, ConfigMaps, and Secrets
- Prometheus HTTP API queries
- Python requests
- Argo CD Notifications

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications Slack service documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/slack/
- Argo CD Go package documentation for operation handling: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/util/argo

## Issues Found
- The original PostSync hook attempted to call the Argo CD sync API from inside the active sync operation. Argo CD hooks run as part of the sync operation, and Argo CD rejects starting another operation while one is already in progress. I changed the PostSync example so it performs verification and fails the sync, then explains that rollback should be triggered by an external controller or job after the operation completes.
- The RBAC example bound Argo CD permissions to a Kubernetes service account while generating a token for an unrelated `rollback-bot` account. I added an `argocd-cm` local account definition for `rollback-bot`, bound Argo CD RBAC to that account, and kept the Kubernetes service account only for the workload identity.
- The RBAC example included `applications, action/rollback`, which is not the documented permission needed for application rollback or sync operations. I removed it and kept the documented `get` and `sync` permissions, with a note about `override` when explicit revision sync override enforcement is enabled.
- The CLI rollback example used the admin password and ran as a PostSync hook. I changed it to use the generated API token and described it as an external job/controller that runs after the failed sync operation has completed.
- The external controller Deployment referenced `ARGOCD_TOKEN` in code but did not define it in the manifest. I added the environment variable from the `argocd-api-token` Secret.
- The external controller only watched `Degraded` health, which would miss verification failures that mark the Argo CD operation as `Failed` while resources remain Healthy. I updated it to watch both `Degraded` health and failed operation state, and to skip rollback while `.operation` is still present.
- The notification template used `app.status.history[-1]`, which is not safe in Argo CD notification templates and did not reliably identify rollback. I changed the trigger to fire for successful operations initiated by `rollback-bot` and removed the negative history indexing.

## Review Notes
The examples are still illustrative and use placeholder images such as `myorg/deployment-verifier:latest`, `myorg/argocd-verifier:latest`, and `myorg/auto-rollback-controller:latest`. Those images must include the tools shown in the scripts, such as `curl`, `jq`, `bc`, Python dependencies, or the Argo CD CLI as applicable.
