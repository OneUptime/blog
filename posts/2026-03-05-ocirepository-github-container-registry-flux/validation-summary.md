# Validation Summary: How to Configure OCIRepository with GitHub Container Registry in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux OCIRepository
- Flux CLI OCI artifact commands
- Kubernetes Kustomization resources
- Kubernetes docker-registry Secrets
- GitHub Container Registry (GHCR)
- GitHub Actions

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux `flux push artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `flux list artifacts` CLI reference: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux `flux tag artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux v2.6 release notes: https://fluxcd.io/blog/2025/05/flux-v2.6.0/
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Packages with GitHub Actions documentation: https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions

## Issues Found
- The prerequisite listed Flux CD v0.35 or later, but the post uses `source.toolkit.fluxcd.io/v1` for `OCIRepository`. Flux v2.6 release notes document the `OCIRepository` v1 API and stable OCI artifact CLI commands, so I updated the prerequisite to Flux CD v2.6 or later.
- The local push example piped `$GITHUB_TOKEN` into `flux push artifact` while also using `--creds`, which did not match the comment saying it was logging in to GHCR. I changed it to an explicit `docker login ghcr.io` followed by `flux push artifact`, matching Flux's documented GHCR workflow.
- The artifact listing example used `--creds` after the login-based workflow. I removed the redundant direct credentials so it uses the Docker credential store created by `docker login`, which Flux documents as supported.
- The GitHub Actions workflow passed `secrets.GITHUB_TOKEN` directly through `--creds`. GitHub and Flux documentation show authenticating to GHCR in Actions with `docker/login-action` and `GITHUB_TOKEN`, so I added a GHCR login step and removed direct Flux credential flags from `flux push artifact` and `flux tag artifact`.

## Review Notes
The remaining OCIRepository and Kustomization manifests use current Flux API versions and field names. The examples assume the referenced GHCR namespace/package path exists or can be created by the authenticated user or workflow, and private package access must still be granted according to GitHub Packages permissions.
