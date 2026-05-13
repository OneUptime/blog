# Validation Summary: How to Use Variable Substitution for Cluster Environment in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- Kustomize
- ConfigMaps
- Secrets

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux envsubst` documentation: https://fluxcd.io/flux/cmd/flux_envsubst/

## Issues Found
- The post stated that missing variables remain as literal `${var}` placeholders. Flux documentation says undefined `${var}` variables are substituted with an empty string unless a default value is provided, so this was corrected.
- The validation command used `flux get kustomization my-app`, but the documented Flux command is `flux get kustomizations`. The command and description were updated to check Kustomization status with the Flux CLI.
- The strict substitution section implied strict mode could be enabled through the shown `postBuild` YAML. Flux strict post-build substitution is enabled with the kustomize-controller feature gate `--feature-gates=StrictPostBuildSubstitutions=true`; local strict testing is done with `flux envsubst --strict`. The section was corrected.
- The examples referenced ConfigMaps and Secrets via `substituteFrom` without stating that those resources must exist in the same namespace as the Flux Kustomization. A short note was added to clarify this requirement.

## Review Notes
The Flux CLI was not installed in the local environment, so CLI command verification was done against the official Flux command documentation instead of local `--help` output.
