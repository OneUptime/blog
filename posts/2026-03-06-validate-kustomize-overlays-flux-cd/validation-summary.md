# Validation Summary: How to Validate Kustomize Overlays for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kustomize
- Kubernetes manifests
- kubeconform
- Bash scripting
- GitHub Actions

## Sources Consulted
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux CLI `flux build kustomization` documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- kubeconform README and schema-location documentation: https://github.com/yannh/kubeconform
- Flux release assets for `crd-schemas.tar.gz`: https://github.com/fluxcd/flux2/releases
- Local verification with downloaded `kustomize v5.8.1`, `kubeconform v0.7.0`, and `flux 2.8.7` CLI help output.

## Issues Found
- The production Kustomize overlay used `patchesStrategicMerge` and listed the HPA under patches. `patchesStrategicMerge` is deprecated in current Kustomize, and the HPA is a new resource, not a patch for an existing resource. Changed the overlay to use `resources` for the HPA and the current `patches` field for Deployment and ConfigMap patches.
- The production overlay used `commonLabels`, which current Kustomize warns about as deprecated. Replaced it with the `labels` field and `includeSelectors: true` to preserve the intended selector-label behavior.
- The build, schema, and requirements Bash scripts used `find ... | while read ...`, causing `ERRORS` increments to happen in a subshell and not affect the final exit status. Replaced those loops with process substitution so failures correctly produce a non-zero exit.
- Overlay display names were reported as `overlays/production` instead of `component/production`. Corrected the path calculation.
- The kubeconform Flux schema location template did not match the filenames inside Flux's official `crd-schemas.tar.gz`. Changed validation to build a kubeconform-compatible local schema layout from the downloaded Flux schema files.
- The Flux build command was presented as a local validation command but omitted `--dry-run`, so it could try to contact the Kubernetes API. Added `--dry-run` for local/CI validation.
- The GitHub Actions kubeconform install extracted into `/usr/local/bin` without `sudo`, which can fail on GitHub-hosted runners. Added `sudo` for the extraction and downloaded Flux CRD schemas for the CI schema validation step.
- The requirements section said it checked all environments and health checks, but the script only checks production resource limits, HPA presence, and replica count. Updated the wording to match the actual script behavior.

## Review Notes
The corrected Kustomize overlay was rendered successfully with Kustomize v5.8.1, and the Flux Kustomization example validated successfully with kubeconform v0.7.0 using the downloaded Flux schema bundle. The requirement-check script is intentionally policy-specific and still uses simple checks; future improvements could replace the remaining grep-based replica check with structured YAML parsing.
