# Validation Summary: How to Tag OCI Artifacts with Flux CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- OCI artifacts
- OCIRepository custom resources
- Kubernetes YAML
- GitHub Actions
- Docker registry authentication
- GitHub Container Registry

## Sources Consulted
- Flux CLI `flux tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI `flux list artifacts` documentation: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux CLI source for `tag artifact`: https://raw.githubusercontent.com/fluxcd/flux2/main/cmd/flux/tag_artifact.go

## Issues Found
- The `flux push artifact --revision` example used `main/<commit-sha>`, but Flux documents the revision format as `<branch|tag>@sha1:<commit-sha>`. Changed it to `main@sha1:$(git rev-parse HEAD)` so the command matches the official Flux CLI format.

## Review Notes
- The Flux CLI was not installed in the local environment, so CLI verification was performed against official Flux documentation and the Flux source code.
- The `flux tag artifact`, `flux list artifacts`, `flux push artifact`, `OCIRepository` `apiVersion: source.toolkit.fluxcd.io/v1`, `.spec.url`, and `.spec.ref.tag` examples match the current official Flux documentation.
