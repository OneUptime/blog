# Validation Summary: How to Build OCI Artifacts from Kustomize Overlays with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux CLI
- Flux OCIRepository
- Flux Kustomization
- Kubernetes
- Kustomize
- OCI artifacts and container registries
- Bash scripting

## Sources Consulted
- Flux `flux push artifact` command reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux v2.6 release notes/API versions: https://fluxcd.io/blog/2025/05/flux-v2.6.0/

## Issues Found
- The comparison table and recommendation implied that raw overlays are uniquely flexible because Flux can apply post-rendering patches, while pre-built/plain manifests can also be processed by Flux Kustomization features such as patches and post-build substitution. Updated the table and recommendation to state the accurate distinction: raw overlays are built by Flux at reconciliation time, while pre-built artifacts already contain rendered manifests.

## Review Notes
- The `flux push artifact` examples use current flags (`--path`, `--source`, and `--revision`) and the documented revision format.
- The `OCIRepository` examples use the current `source.toolkit.fluxcd.io/v1` API, valid `url`, `ref.semver`, and `secretRef` fields for Flux v2.6+.
- The Flux `Kustomization` examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid `sourceRef`, `path`, `prune`, and `wait` fields.
- The pre-built manifest approach is valid because Flux can generate a `kustomization.yaml` for plain YAML manifests under the configured path.
