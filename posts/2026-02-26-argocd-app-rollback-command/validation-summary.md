# Validation Summary: How to Use argocd app rollback for Emergency Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- GitOps
- Kubernetes
- Helm
- Bash
- jq

## Sources Consulted
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Application API `RevisionHistory` type reference: https://pkg.go.dev/gopkg.in/argoproj/argo-cd.v2/pkg/apis/application/v1alpha1#RevisionHistory

## Issues Found
- The post stated that auto-sync would immediately re-sync and undo a rollback. Official Argo CD documentation states that rollback cannot be performed while automated sync is enabled. Updated the wording to say rollback is blocked until auto-sync is disabled, and clarified that re-enabling auto-sync before fixing Git can later resync the current desired state.
- The emergency script used `argocd app history -o json`, but the current official `argocd app history` command reference lists only `wide` and `id` as supported output formats. Removed JSON parsing from the script and used Argo CD's documented behavior of omitting the rollback ID to roll back to the previous deployed version.
- The Helm example used `argocd app history my-app -o json` to inspect Helm source data. Replaced it with the documented `argocd app history my-app` command while preserving the point that rollback restores the source configuration from the selected history entry.

## Review Notes
- The `argocd app sync --revision ... --resource ...` partial-sync example matches the documented `--revision` and `--resource` flags, but it should be treated as an operational workaround rather than a true application rollback.
- The recommendation to increase `revisionHistoryLimit` is technically valid, but official Argo CD docs caution that increasing it raises storage usage and should be done deliberately.
