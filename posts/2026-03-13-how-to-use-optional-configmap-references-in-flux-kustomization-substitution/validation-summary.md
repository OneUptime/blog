# Validation Summary: How to Use Optional ConfigMap References in Flux Kustomization Substitution

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization API
- Kubernetes ConfigMaps
- Kubernetes kubectl
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux documentation for reacting to referenced ConfigMap and Secret changes: https://fluxcd.io/flux/components/kustomize/kustomizations/#reacting-immediately-to-configuration-dependencies

## Issues Found
- The progressive feature rollout example claimed that values from an optional ConfigMap override inline `substitute` defaults. Flux documents the opposite: inline `substitute` values take precedence over `substituteFrom` values. Removed the inline defaults from that example and explained that manifest default expressions such as `${ENABLE_NEW_UI:=false}` should be used when ConfigMap values need to override defaults.
- The "Combining Optional ConfigMaps with Inline Defaults" section recommended inline defaults for values that should be overridden by optional ConfigMaps. Changed the section to use manifest defaults and kept an inline `var_substitution_enabled` placeholder to ensure substitution runs when only default expressions are present.
- The precedence section said earlier `substituteFrom` entries override later ones. Flux's current documentation says later entries overwrite earlier entries. Updated the precedence text and example ordering.
- The verification section used a label selector that could miss relevant ConfigMaps and said status shows whether optional ConfigMaps were found. Replaced it with a direct `kubectl get configmap` command and clarified that Kustomization status confirms reconciliation success, not the presence of optional references.
- The Flux CLI command used the singular `flux get kustomization`. Updated it to the documented `flux get kustomizations` command.

## Review Notes
The core `optional: true` behavior is accurate: missing optional ConfigMap or Secret references are tolerated and treated as empty sources. The referenced ConfigMap should reside in the same namespace as the Kustomization resource, which the examples satisfy by using `flux-system`.
