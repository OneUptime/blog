# Validation Summary: How to Handle Imperative Operations in a GitOps World

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments
- Kubernetes Jobs
- Horizontal Pod Autoscaler
- kubectl
- yq
- GitHub CLI

## Sources Consulted
- Argo CD resource actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- Argo CD diff strategies documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Kubernetes kubectl command reference for `rollout restart`: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes labels and annotations reference for `kubectl.kubernetes.io/restartedAt`: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Job TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- GitHub CLI `gh pr merge` manual: https://cli.github.com/manual/gh_pr_merge
- yq assign/update operator documentation: https://mikefarah.gitbook.io/yq/operators/assign-update
- Linked OneUptime post on Argo CD OutOfSync alerts: https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-outofsync-applications/view

## Issues Found
- The Argo CD Application example omitted `spec.project`, which is part of the documented Application spec. Added `project: default`.
- The standalone Job example implied `ttlSecondsAfterFinished` cleanup is always safe under Argo CD reconciliation. Added a caveat that automated self-heal can recreate the Job while it remains in Git.
- The server-side diff section implied server-side diff itself ignores controller-owned fields. Updated it to explain that server-side diff uses server-side apply dry-run, while `ignoreDifferences` handles controller-owned fields.
- The emergency `yq` command assigned through an array filter in a fragile form. Rewrote it using the documented yq pattern of wrapping the selected left-hand path before assignment.

## Review Notes
The remaining examples are consistent with current Argo CD and Kubernetes documentation. The exact `managedFieldsManagers` value should be verified in each target cluster because controller manager names vary by controller and distribution.
