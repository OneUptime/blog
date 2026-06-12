# Validation Summary: How to Build ArgoCD Automated Sync Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Prometheus
- Argo CD CLI
- YAML configuration

## Sources Consulted
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD AppProject Specification Reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/project-specification/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/

## Issues Found
- The `prune` explanation was too broad. Argo CD prunes resources tracked as part of the application, not arbitrary cluster resources. Updated the wording to "application resources."
- The self-healing timing description incorrectly called the 5-second behavior a reconciliation loop. Official docs describe a self-heal timeout, controlled by `--self-heal-timeout-seconds`. Updated the explanation.
- The `allowEmpty` explanation said it could delete everything in the destination namespace. Official docs describe allowing automated sync with prune to delete all application resources. Updated the wording.
- The `Validate=true` explanation incorrectly described server-side dry-run validation. Official docs describe `Validate=false` as disabling kubectl apply validation, with validation enabled by default. Updated the explanation.
- The Prometheus sync duration query used `histogram_quantile` on `argocd_app_sync_total`, which is a counter and has no `le` bucket label. Replaced it with an average duration query using `argocd_app_sync_duration_seconds_total` divided by `argocd_app_sync_total`.
- The CLI example for enabling prune and self-heal did not explicitly enable automated sync. Updated it to include `--sync-policy automated` with `--auto-prune --self-heal`.

## Review Notes
The remaining Application, AppProject, sync option, retry, sync window, ignoreDifferences, and CLI examples are consistent with current Argo CD documentation. Argo CD also supports `spec.syncPolicy.automated.enabled`, but the existing `automated: {}` examples remain valid.
