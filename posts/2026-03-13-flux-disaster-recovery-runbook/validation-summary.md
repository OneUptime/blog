# Validation Summary: How to Create a Disaster Recovery Runbook for Flux CD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Helm
- Sealed Secrets
- 1Password CLI

## Sources Consulted
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap guide: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux reconcile source git CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux get sources git CLI documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux resume HelmRelease CLI documentation: https://fluxcd.io/flux/cmd/flux_resume_helmrelease/
- Flux HelmRelease guide and API documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux Sealed Secrets guide: https://fluxcd.io/flux/guides/sealed-secrets/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Helm rollback command documentation: https://helm.sh/docs/helm/helm_rollback/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The bootstrap examples used `--token-env=GITHUB_TOKEN`, which is not a current `flux bootstrap github` flag. Replaced it with `--token-auth`, while keeping the documented `GITHUB_TOKEN` environment variable.
- The diagnosis examples used `flux describe source git ...` and `flux describe helmrelease ...`, but the current Flux CLI command set does not include `flux describe`. Replaced those with `kubectl describe gitrepository ...` and `kubectl describe helmrelease ...`.
- The nested Markdown examples used triple backtick fences around content that itself contained triple backtick code blocks. Updated the outer fences to four backticks and corrected the inner closing fences so the examples render correctly.
- The Sealed Secrets restore example used `kube-system` and deployment `sealed-secrets`, while the Flux Sealed Secrets guide installs the controller as `sealed-secrets-controller` in `flux-system`. Updated the restore and rollout restart commands to match that Flux-oriented setup.
- The `kubectl wait` example used lowercase `ready`; updated it to `Ready` to match the Kubernetes documentation examples, though Kubernetes condition matching is case-insensitive.

## Review Notes
- The recovery commands use placeholder names such as `my-org`, `my-fleet`, `production`, and `my-app`; operators must replace these with environment-specific values before using the runbook.
- The Helm rollback example is syntactically valid because Helm allows the revision argument to be omitted, in which case it rolls back to the previous release.
- The Git authentication secret update is correct for HTTPS basic authentication when the `GitRepository` references the `flux-system` Secret and bootstrap is configured with token authentication.
