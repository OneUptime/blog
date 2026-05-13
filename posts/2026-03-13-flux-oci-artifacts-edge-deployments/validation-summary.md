# Validation Summary: How to Use OCI Artifacts for Edge Deployments with Flux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- OCI artifacts and OCI-compatible registries
- GitHub Actions
- GHCR
- Cosign
- CNCF Distribution registry pull-through cache
- Kustomize Controller and Source Controller APIs

## Sources Consulted
- Flux OCI Artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux `flux push artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `flux pull artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux `flux tag artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- CNCF Distribution registry configuration: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution pull-through cache recipe: https://distribution.github.io/distribution/recipes/mirror/

## Issues Found
- The post described Flux OCI artifact metadata as a separate artifact layer. Flux documents a manifest with annotations, a Flux config media type, and a compressed content layer, so the artifact structure diagram was corrected.
- The `OCIRepository` example used a semver range even though the earlier GitHub Actions workflow only published `latest` and commit-SHA tags. The example now uses `tag: latest` and keeps semver as a commented option for workflows that publish semantic version tags.
- The cosign signing example used `--key cosign.key` while the following command generated a key in Google Cloud KMS. The signing command now uses the same KMS key URI.
- The best-practice note about semver pinning now states that it applies when semantic version tags are published.

## Review Notes
The remaining commands and manifests match current Flux documentation for `flux push artifact`, `flux pull artifact`, `flux tag artifact`, `OCIRepository`, Flux Kustomization source references, cosign public-key verification, and registry pull-through cache configuration. The exact bandwidth savings are workload-dependent, but the claim is framed as typical and is directionally consistent with artifact-based delivery.
