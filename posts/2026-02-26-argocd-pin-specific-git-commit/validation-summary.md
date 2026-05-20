# Validation Summary: How to Pin an Application to a Specific Git Commit in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Application resources
- Argo CD CLI
- Git commit revisions
- Kubernetes manifests
- GitOps deployment workflows

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Tracking and Deployment Strategies: https://argo-cd.readthedocs.io/en/latest/user-guide/tracking_strategies/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_history/
- Git revisions documentation: https://git-scm.com/docs/gitrevisions

## Issues Found
- Several fictional commit SHA examples used non-hexadecimal characters such as `g`, `h`, `x`, `y`, `z`, `w`, `p`, `q`, `r`, and `s`. Git SHA-1 object names are hexadecimal strings, and abbreviated revisions must be unique leading substrings of valid object names. Updated those examples to valid hexadecimal short and full commit IDs.

## Review Notes
The Argo CD `targetRevision` usage, Application manifest fields, sync policy fields, and CLI flags shown in the post match the current Argo CD documentation. Short SHA examples are technically valid when the abbreviation is unambiguous, but the post correctly recommends full commit IDs for clarity and safety.
