# Validation Summary: How to Use Post-Build Substitution with HelmRelease Values in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux Kustomization
- Flux HelmRelease
- Kubernetes
- Helm
- Kustomize post-build substitution

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux v2.3 GA release notes: https://v2-6.docs.fluxcd.io/blog/2024/05/flux-v2.3.0/

## Issues Found
- The prerequisites said Flux v2.3 works with Kubernetes 1.25 or later. Flux v2.3 upstream release notes list Kubernetes 1.28, 1.29, and 1.30 as supported, so the prerequisite was updated to reflect supported Kubernetes versions for the Flux release in use.
- The post said post-build substitution replaces variables with string values. Flux substitution values are configured as strings, but unquoted substituted YAML values can be parsed as numbers or booleans, so the wording was corrected.
- The `valuesFrom` example included `targetPath: ""`. Flux merges values at the root when `targetPath` is omitted, so the empty field was removed to match the documented form.
- The verification commands checked for the HelmRelease in `flux-system`, but the example HelmRelease is created in the substituted application namespace. The commands were updated to use the `web` namespace and the `nginx` HelmRelease from the main example.
- The Flux CLI examples used singular `flux get helmrelease` and `flux get kustomization`. The official documented commands are `flux get helmreleases` and `flux get kustomizations`, so the commands were updated.
- The post implied missing variable substitution always fails. Flux defaults missing `${var}` substitutions to an empty string unless strict post-build substitution is enabled, so the failure description was narrowed to missing referenced ConfigMaps or Secrets and strict missing-variable mode.

## Review Notes
The core technique is technically valid: Flux performs Kustomization post-build substitution on the final manifest output, and HelmRelease resources in that output can contain substitution placeholders. For future improvements, consider adding a note that sensitive Helm values should usually come from Kubernetes Secrets or secret-management workflows rather than plain ConfigMaps or inline substitution values.
