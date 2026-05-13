# Validation Summary: How to Troubleshoot Post-Build Substitution Not Working in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux CLI
- Kubernetes Kustomization custom resources
- Kustomize
- Kubernetes ConfigMaps and Secrets
- HelmRelease values

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `build kustomization` documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux HelmRelease values documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `envsubst` documentation: https://fluxcd.io/flux/cmd/flux_envsubst/

## Issues Found
- Replaced the non-standard `SubstitutionFailed` status reason with `ReconciliationFailed`, which matches the documented Flux Kustomization failure reasons.
- Corrected the `flux get kustomization my-app` command to `flux get kustomizations`, matching the Flux CLI command documented for Kustomization status.
- Clarified variable syntax to include Flux's supported variable-name pattern and bash-style default/string operations.
- Corrected the missing ConfigMap/Secret behavior for `substituteFrom`: Flux fails reconciliation by default and only treats a missing object as empty when `optional: true` is set.
- Corrected undefined-variable behavior: Flux substitutes missing variables with an empty string unless a default is provided, and strict failure requires `StrictPostBuildSubstitutions` or local `flux envsubst --strict`.
- Fixed the v1beta2 API example, which incorrectly repeated `kustomize.toolkit.fluxcd.io/v1`.
- Added the Flux-specific `flux build kustomization` caveat for plain YAML directories without a `kustomization.yaml`.
- Corrected the HelmRelease `valuesFrom` explanation to distinguish substitution in the HelmRelease manifest from values loaded later by helm-controller.
- Corrected numeric and boolean substitution guidance to distinguish numeric Kubernetes fields from string fields.
- Replaced the unsupported comment-substitution warning with the documented guidance for escaping literal shell-style variables in scripts and commands.

## Review Notes
The Flux CLI was not installed in the local environment, so CLI verification was performed against official Flux command documentation instead of local `--help` output.
