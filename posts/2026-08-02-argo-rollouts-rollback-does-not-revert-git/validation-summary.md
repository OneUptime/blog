# Validation Summary: Why an Argo Rollouts Rollback Does Not Revert Your Git Commit

## Status
validated

## Post Type
Technical guide / GitOps runbook

## Technologies Covered
- Argo Rollouts
- Argo CD
- Git and GitOps
- Kubernetes Rollouts, ReplicaSets, pod templates, and container images
- Helm, Kustomize, and ApplicationSet source generation
- Progressive delivery, canary analysis, rollback, and roll-forward workflows

## Sources Consulted
- Argo Rollouts FAQ (Git write-back, rollback behavior, Argo CD synchronization, and Argo CD rollback relationship): https://argo-rollouts.readthedocs.io/en/stable/FAQ/
- Argo Rollouts Getting Started (abort, stable ReplicaSet restoration, degraded health, and return to the stable desired state): https://argo-rollouts.readthedocs.io/en/stable/getting-started/
- Argo Rollouts Rollback Windows: https://argo-rollouts.readthedocs.io/en/stable/features/rollback/
- Argo Rollouts `get rollout` command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/
- Argo CD Automated Sync Policy (self-healing and rollback restriction under automated sync): https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD Automation from CI Pipelines: https://argo-cd.readthedocs.io/en/stable/user-guide/ci_automation/
- Kubernetes container image names and immutable digest syntax: https://kubernetes.io/docs/concepts/containers/images/#image-names
- Git `git revert` documentation: https://git-scm.com/docs/git-revert

## Issues Found
- The runbook used `kubectl argo rollouts get rollout --watch` without the required rollout-name positional argument. Changed it to `kubectl argo rollouts get rollout <rollout-name> --watch`, matching the current Argo Rollouts CLI syntax.

## Review Notes
- The core ownership-boundary explanation is consistent with the Argo Rollouts FAQ: Argo Rollouts does not read or write Git, an abort restores the stable workload in the cluster without changing the desired pod template, and Argo CD can still report the resource spec as synchronized while rollout health is degraded.
- The `rollbackWindow` claim is current for canary and blue-green Rollouts. The feature has been available since Argo Rollouts v1.4 and fast-tracks eligible recent revisions by skipping normal rollout steps.
- The image digest snippet is a valid Kubernetes container-image fragment once the placeholder is replaced with an actual SHA-256 digest.
- Argo CD currently documents that application rollback cannot be performed while automated sync is enabled, so the recommendation to use a Git revert in automated GitOps workflows remains accurate.
