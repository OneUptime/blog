# Validation Summary: How to Configure GitRepository Include Paths in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- GitRepository custom resources
- Kubernetes
- kubectl
- Flux CLI
- Kustomize

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI reference for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux source-controller GitRepository reconciler source: https://github.com/fluxcd/source-controller/blob/main/internal/controller/gitrepository_controller.go
- Flux artifact storage copy implementation: https://github.com/fluxcd/pkg/blob/main/artifact/storage/filesystem.go

## Issues Found
- The post said each include entry has "two fields" while listing three fields. Updated this to describe the fields accurately and noted that `fromPath` and `toPath` are optional with documented defaults.
- The reconciliation sequence said the controller clones the main repository before fetching included artifacts. Updated the wording to match the controller behavior: it verifies included artifacts are available, then clones the main repository and copies included contents.
- The command `flux get sources git my-app -n flux-system` was not valid according to the current Flux CLI reference, which documents `flux get sources git [flags]`. Updated it to `flux get sources git -n flux-system`.
- The troubleshooting note said path conflicts may overwrite local files. The Flux storage implementation renames or copies included content to `toPath`; conflicts can fail or replace a file depending on the target. Updated the wording to reflect that behavior.

## Review Notes
The main Flux `spec.include` examples use the current `source.toolkit.fluxcd.io/v1` API and match the documented schema. The same-namespace include behavior is correct because `repository` is a local object reference resolved in the including GitRepository namespace.
