# Validation Summary: How to Configure Kustomization Patches in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kustomize patches
- Kubernetes strategic merge patches
- JSON6902 patches
- Kubernetes CLI usage

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Kubernetes Kustomize patch references linked from the Flux documentation: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/

## Issues Found
- The introduction said patches are applied after Kustomize builds the manifests. Flux documents `spec.patches` as Kustomize patches that are included in the build, so this was corrected to say patches are applied as part of the Kustomize build before the final manifests are sent to the cluster.
- The verification command used `flux build kustomization my-app --path ./deploy`, which builds from the in-cluster Kustomization by default. For previewing local patch changes before pushing, the command needs a local Flux Kustomization file and dry-run mode. The example was changed to include `--kustomization-file ./kustomization-patch.yaml --dry-run`, and the related best-practice item was updated.

## Review Notes
The patch examples use current Flux `kustomize.toolkit.fluxcd.io/v1` syntax and match Flux's documented support for inline strategic merge and JSON6902 patches. The examples assume the targeted resource shapes exist, such as a Deployment named `web-app` with containers named `web`, which is appropriate for illustrative snippets.
