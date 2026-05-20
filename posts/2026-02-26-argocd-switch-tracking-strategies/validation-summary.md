# Validation Summary: How to Switch Between Tracking Strategies in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Application manifests
- Argo CD CLI
- Helm chart version tracking
- Git branches, tags, and commit SHAs
- GitHub Actions

## Sources Consulted
- Argo CD Tracking and Deployment Strategies: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/tracking_strategies/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_wait/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/

## Issues Found
- The section title and introduction said there were four tracking strategies, but the post lists five entries: branch, tag, commit SHA, HEAD, and semver constraints. Updated the wording to "five" to match the content.
- The strategy table described Git tags as an "immutable reference." Git tags are typically stable release references, but they can be moved or re-tagged, and Argo CD's documentation explicitly discusses re-tagging. Updated the stability wording to "stable if tags are not moved."
- The CI/CD example said it automatically promotes the latest tag, but the workflow uses a manual `workflow_dispatch` input named `version`. Updated the description to say it promotes a selected tag.

## Review Notes
The Argo CD CLI flags shown in the post, including `--revision`, `--sync-policy`, `--auto-prune`, `--self-heal`, `sync --prune`, and `wait --health --timeout`, match the official command references. The Application manifest uses the documented `spec.source.targetRevision` field. The examples assume single-source Applications; multi-source Applications expose revisions differently in status.
