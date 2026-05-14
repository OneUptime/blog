# Validation Summary: How to Set Up GitRepository Commit SHA Pinning in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Source Controller
- Kubernetes GitRepository custom resources
- Flux CLI
- kubectl
- Git

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux reconcile source git` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/

## Issues Found
- The post stated that `branch` must be specified when using `spec.ref.commit`. Flux documentation shows `spec.ref.commit` can be used alone, and can optionally be combined with `spec.ref.branch` to perform a shallow clone where the commit must exist on that branch. Updated the explanation and troubleshooting notes accordingly.
- The verification command used `flux get sources git my-app -n flux-system`, but the official command synopsis lists `flux get sources git [flags]` and examples show listing sources rather than passing a source name. Updated the command to `flux get sources git -n flux-system`.
- The Git command for listing recent commits used `git log --oneline`, which prints abbreviated SHAs. Updated it to `git log --format='%H %s' -10 main` so it matches the post's guidance to use full 40-character commit SHAs.
- The post described commit pinning as guaranteeing the same artifact for reproducible builds. Since GitRepository produces a source artifact, adjusted the wording to "reproducible source artifacts" to avoid overclaiming build reproducibility.

## Review Notes
The Flux `source.toolkit.fluxcd.io/v1` GitRepository API, `spec.ref.commit`, `status.artifact.revision`, and `status.artifact.lastUpdateTime` fields are current and valid in the official documentation. The `kubectl apply`, `kubectl patch`, JSONPath, and `flux reconcile source git` examples are consistent with current Flux and Kubernetes usage.
