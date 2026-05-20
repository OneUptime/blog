# Validation Summary: How to Use Resource Health for Automated Rollbacks in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD resource health checks
- Argo CD resource hooks
- Argo CD notifications
- Argo CD CLI rollback and history commands
- Argo Rollouts
- Kubernetes Jobs and CronJobs
- Prometheus metrics and PromQL
- Git rollback workflows

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_history/
- Argo Rollouts Analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts getting started rollback behavior: https://argoproj.github.io/argo-rollouts/getting-started/
- Argo Rollouts controller metrics documentation: https://argoproj.github.io/argo-rollouts/features/controller-metrics/

## Issues Found
- The PostSync hook was described as a general health-degradation detector. Argo CD PostSync hooks run only after sync succeeds and resources are Healthy, so the text now describes it as a post-deployment smoke test for failures after the initial healthy state.
- The hook Jobs used fixed `metadata.name` values with only `HookSucceeded` deletion. Argo CD named hooks are only created once unless deleted before creation, so the examples now use `generateName` and delete both succeeded and failed hook Jobs.
- The Rollouts section said failed analysis automatically rolls back the desired deployment state. Argo Rollouts aborts and falls back to the stable ReplicaSet, but Git still points at the failed desired state, so the text now calls out the need to revert or update Git.
- The Rollouts Prometheus health metric used Kubernetes Deployment metrics even though the example replaced the Deployment with a Rollout. The query now uses Argo Rollouts controller metrics for available and desired replicas.
- The notification webhook template attempted to compute a previous revision with invalid Go template syntax and would have produced the wrong rollback input. The payload now sends the current revision, and the text says the external service should look up the previous deployment history ID.
- The rollback command placeholder used "previous revision ID", but `argocd app rollback` expects an Argo CD deployment history ID. The placeholder and CronJob comments were updated accordingly.
- The CronJob selected `.[1].id` from history, which is not the previous deployment in normal chronological history output. It now selects the second-to-last history entry when at least two entries exist.
- The final health-check reference was plain text instead of a link. It now links to the referenced OneUptime post.

## Review Notes
The CronJob and Git-revert examples remain illustrative and would still need production hardening, including least-privilege credentials, loop prevention, branch protection handling, and stronger logic for identifying the last known-good history entry.
