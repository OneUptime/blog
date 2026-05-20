# Validation Summary: How to Auto-Promote from Staging to Production with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes
- GitHub Actions
- Kustomize
- Prometheus
- Slack notifications
- Git

## Sources Consulted
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_history/
- Argo CD Slack notifications documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo Rollouts canary strategy documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The second Argo Rollouts inline analysis step referenced the `success-rate` AnalysisTemplate without passing the required `service-name` argument. Added the missing `args` block so the required AnalysisTemplate argument is supplied each time the template is used.
- The Argo CD Notifications example defined triggers and templates but did not configure the Slack service or show the required Application subscription annotations. Added `service.slack` and the production Application notification annotations.
- The rollback job used `argocd app history --output json`, but the current Argo CD command reference only documents `wide` and `id` output for `argocd app history`. Removed that unused command.
- The rollback job was shown as a separate GitHub Actions job but did not install/login to the Argo CD CLI or check out the config repository before running `argocd` and `git` commands. Added those setup steps and Git author configuration for the revert commit.
- The business-hours guard compared an ISO push timestamp directly to `09:00` and `16:00`, which does not correctly evaluate the local hour. Replaced it with a shell step that checks the current hour in a named timezone.

## Review Notes
- The Argo CD Application manifests use current `syncPolicy.automated`, `prune`, `selfHeal`, `syncOptions`, and retry fields.
- The `argocd app wait --sync --health --timeout` usage matches the Argo CD CLI command reference.
- The Argo Rollouts canary and AnalysisTemplate examples use current `argoproj.io/v1alpha1` resources and supported inline analysis fields.
- Production auto-sync is technically valid, but teams should ensure rollback is done through Git when automated sync is enabled, because direct Argo CD rollback is not supported with auto-sync enabled.
