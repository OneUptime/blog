# Validation Summary: How to Implement ArgoCD Rollbacks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Argo CD
- Argo CD CLI
- Argo Rollouts
- Git
- Bash
- YAML
- Prometheus
- Argo CD Notifications

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_rollback/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_set/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo Rollouts rollout specification: https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts rollback window documentation: https://argo-rollouts.readthedocs.io/en/stable/features/rollback/
- Git revert documentation: https://git-scm.com/docs/git-revert

## Issues Found
- The history retention example incorrectly used `argocd-cm` health customization and `controller.status.processors` as if they controlled deployment history. Replaced it with the supported `argocd app set myapp --revision-history-limit 15` command and kept the valid `spec.revisionHistoryLimit` example.
- `argocd app history myapp --id 2` is not a supported command. Replaced it with `argocd app get myapp -o json | jq '.status.history[] | select(.id == 2)'`.
- Several scripts used `argocd app history -o json`, but the official command only supports `wide` and `id` output. Updated those scripts to read `.status.history` from `argocd app get -o json`.
- The post implied Argo CD automated sync can natively perform health-based rollbacks. Updated the text to clarify that Argo CD can auto-sync, retry, and self-heal drift, but automated rollback requires an external controller or Argo Rollouts. Also noted that rollback cannot be performed while automated sync is enabled.
- The CronJob rollback example used an outdated Argo CD 2.9 image and did not account for in-cluster authentication. Updated it to a supported Argo CD 3.4 image, use `--core`, disable automated sync before rollback, and remove an inaccurate five-minute health-duration comment.
- The Argo Rollouts example described `rollbackWindow` as automatic rollback on analysis failure. Updated the wording to match the official behavior: analysis can abort rollout progression, while `rollbackWindow` fast-tracks rollbacks to recent ReplicaSets.
- The Rollout and Deployment YAML examples were missing required Kubernetes fields such as selectors, pod template labels, and container images. Added minimal required fields so the snippets are structurally valid.
- The sync-wave Job used `argocd.argoproj.io/hook-delete-policy` without declaring it as an Argo CD hook. Added the `argocd.argoproj.io/hook: Sync` annotation.
- Two `git revert` examples used `-m` as if it set a commit message, but in Git it selects the mainline parent for reverting merge commits. Replaced those commands with valid `git revert ... --no-edit` examples.

## Review Notes
Argo CD 3.4, 3.3, and 3.2 are the supported release lines as of this review date. The post now avoids relying on unsupported Argo CD 2.9 behavior. Automated rollback remains a design pattern rather than a built-in Argo CD feature, so production implementations should add RBAC, audit logging, guardrails, and checks to ensure the selected previous revision is actually known-good.
