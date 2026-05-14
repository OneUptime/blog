# Validation Summary: How to Use Git Tags for Release Promotion with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD GitRepository and Kustomization APIs
- Flux CLI
- Kubernetes and Kustomize
- Git tags and semantic versioning
- GitHub Actions

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `suspend source` documentation: https://fluxcd.io/flux/cmd/flux_suspend_source/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Masterminds SemVer constraints documentation: https://github.com/Masterminds/semver#checking-version-constraints
- Git `git-tag` documentation: https://git-scm.com/docs/git-tag.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The post described Git tags as immutable references that cannot be accidentally modified. Git tags can be force-replaced or deleted, so the wording was changed to describe tags as stable release markers that should be protected and treated as immutable.
- The staging Flux `semver` example used `>=1.0.0-rc.1` while saying it tracks release candidates. That range can also select stable tags, so it was changed to a bounded release-candidate range for the current release train.
- The GitHub Actions workflow created annotated tags without explicitly configuring write permissions or Git author identity. Added `contents: write` and a Git identity setup step so tag creation and push work reliably.
- The monitoring command used `flux get source git`, but the documented Flux command is `flux get sources git`. The command was corrected.

## Review Notes
The Flux `GitRepository.spec.ref.semver` field supports SemVer ranges, but it does not provide a separate regex filter for Git tags. A release-candidate-only staging flow therefore needs a bounded SemVer range for the active release train or a different repository/tagging strategy.
