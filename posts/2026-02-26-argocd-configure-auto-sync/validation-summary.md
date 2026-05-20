# Validation Summary: How to Configure Auto-Sync in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Prometheus metrics
- GitHub webhooks

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Webhook Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD Compare Options: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/

## Issues Found
- The post described the comparison loop as running every 3 minutes. Current Argo CD documentation states that automatic sync is controlled by `timeout.reconciliation`, defaulting to `120s` plus up to `60s` jitter, for a maximum period of 3 minutes. Updated the wording.
- The retry section said failed auto-syncs are not retried without a retry policy and that Argo CD would try again on the next Git poll cycle. Current documentation supports configurable retry behavior and states that failed syncs for the same commit and parameters are not automatically reattempted after failure. Updated the paragraph to describe behavior after retries are exhausted.
- The monitoring example used `argocd app get my-app -w`, but `argocd app get` does not document a `-w` watch flag. Replaced it with `argocd app wait my-app --sync --health`, which is documented for waiting on synced and healthy state.
- The metrics section listed `argocd_app_reconcile_duration_seconds` and `argocd_app_health_status`, which are not the metric names in current Argo CD metrics documentation. Updated them to `argocd_app_sync_duration_seconds_total` and `argocd_app_info`, which contains `sync_status` and `health_status` labels.

## Review Notes
The remaining YAML fields, sync options, pruning, self-heal, allow-empty behavior, webhook endpoint, GitHub content type, webhook secret key, hard refresh command, ignore differences example, and compare-options annotation were consistent with official Argo CD documentation.
