# Validation Summary: How to Set Up GitRepository Tag Tracking in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Source Controller
- Flux GitRepository API (`source.toolkit.fluxcd.io/v1`)
- Flux Kustomization API (`kustomize.toolkit.fluxcd.io/v1`)
- Kubernetes `kubectl`
- Git tags

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux reconcile source git` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux source watcher documentation: https://fluxcd.io/flux/gitops-toolkit/source-watcher/
- Kubernetes `kubectl events` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Git `git-tag` documentation: https://git-scm.com/docs/git-tag

## Issues Found
- The example artifact revision used a shortened placeholder SHA (`v1.2.3@sha1:abc1234def5678`). Flux reports GitRepository artifact revisions in the format `<branch|tag>@sha1:<commit>`, where `<commit>` is the resolved commit SHA. Updated the example to use a full 40-character SHA placeholder.

## Review Notes
- The local environment did not have `flux` or `kubectl` installed, so CLI validation was performed against official Flux and Kubernetes command documentation.
- The guidance about moved tags is technically correct, but moving release tags remains a workflow risk because the same tag name can resolve to a different commit on a later reconciliation.
