# Validation Summary: How to Set Up Gitless GitOps with OCI Artifacts in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux CLI
- Flux Source Controller
- Flux Kustomize Controller
- OCIRepository
- Kubernetes Kustomization
- OCI container registries
- GitHub Actions
- GHCR
- kubectl

## Sources Consulted
- Flux CLI documentation for `flux push artifact`: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI documentation for `flux tag artifact`: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI documentation for `flux install`: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI documentation for `flux get sources oci`: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux v2.6 release notes for OCIRepository v1 API promotion: https://v2-6.docs.fluxcd.io/blog/2025/05/flux-v2.6.0/
- GitHub Actions workflow permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#defining-access-for-the-github_token-scopes
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts

## Issues Found
- The prerequisites listed Flux CD `v0.35 or later`, but the examples use `source.toolkit.fluxcd.io/v1` for `OCIRepository`. The OCIRepository v1 API is documented as promoted in Flux v2.6, so the prerequisite was changed to `v2.6 or later`.
- The GitHub Actions workflow specified `packages: write` only. GitHub Actions sets unspecified permissions to `none` when any permission is specified, which can break `actions/checkout` for private repositories. Added `contents: read`.

## Review Notes
- The Flux CLI commands and flags used in the post match current official documentation, including `flux push artifact`, `flux tag artifact`, `flux install`, and `flux get sources oci`.
- The `OCIRepository` and `Kustomization` API versions and fields are valid for current Flux releases.
- The post uses the mutable `latest` OCI tag for continuous deployment. This is technically valid, but production workflows may prefer immutable tags, SemVer ranges, or digest-pinned promotion policies for stronger rollout auditability.
