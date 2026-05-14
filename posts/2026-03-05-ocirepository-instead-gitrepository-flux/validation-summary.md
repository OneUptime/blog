# Validation Summary: How to Use OCIRepository Instead of GitRepository in Flux

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD
- Kubernetes custom resources
- GitRepository
- OCIRepository
- Kustomization
- OCI registries
- Flux CLI
- kubectl

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI `flux get sources oci` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_oci/

## Issues Found
- The comparison table described Git source limits as "Git hosting API limits." Flux GitRepository primarily performs Git clone/fetch operations, so this was changed to "Git hosting clone/fetch limits."
- The comparison table listed OCI signature verification as only "Cosign OCI signatures." Current Flux OCIRepository verification supports both Cosign and Notation, so this was changed to "Cosign or Notation OCI signatures."
- The comparison table listed Git signature verification as "Git commit signing (GPG)." Flux verifies Git commit or tag signatures using PGP keys, so this was clarified as "Git commit or tag signatures (PGP)."

## Review Notes
The YAML examples use current `source.toolkit.fluxcd.io/v1` and `kustomize.toolkit.fluxcd.io/v1` APIs. The `flux push artifact`, `flux tag artifact`, and `flux get sources oci --watch` commands match current Flux CLI documentation. The local environment did not have the `flux` CLI installed, so command verification was performed against official Flux documentation rather than local `--help` output.
