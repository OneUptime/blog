# Validation Summary: How to Combine Sync Waves and Hooks for Complex Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync phases, hooks, sync waves, and hook delete policies
- Argo CD CLI
- Kubernetes Jobs, Deployments, Services, Secrets, ConfigMaps, Namespaces, and Ingress
- PostgreSQL backup with `pg_dump`
- Slack webhook notification jobs

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The Sync phase example defined an Ingress backend and smoke test for `frontend.my-app.svc`, but did not define a `frontend` Service. Added a wave 2 Service selecting `app: frontend` on port 3000 so the Ingress backend and smoke test can resolve.
- The testing section used `argocd app sync my-app --watch`, but the current official `argocd app sync` command reference does not list a `--watch` flag. Replaced it with `argocd app sync my-app`, which is the documented sync command.
- The hook naming pitfall said a static hook name without a delete policy would fail on the second sync. Current Argo CD documentation says hooks default to `BeforeHookCreation` when no hook delete policy is specified. Updated the guidance to recommend explicitly setting `BeforeHookCreation` for clarity instead of claiming a naming conflict will occur.
- The diagram and execution summary implied SyncFail hooks only run for failures during or after the Sync phase. Updated them to state that SyncFail hooks run when the sync operation is marked failed.

## Review Notes
- The Argo CD hook phases, sync wave ordering, negative wave support, default wave 0 behavior, `PostSync` health requirement, and hook delete policy values match the current official Argo CD documentation.
- The Kubernetes API versions used in the examples are current: `batch/v1` Jobs, `apps/v1` Deployments, `v1` Services/Secrets/ConfigMaps/Namespaces, and `networking.k8s.io/v1` Ingress.
- The example assumes externally managed resources such as `db-creds`, `db-backups`, `slack-webhook`, and `debug-sa` already exist before the hooks run.
