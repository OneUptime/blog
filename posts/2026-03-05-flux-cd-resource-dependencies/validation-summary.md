# Validation Summary: How to Understand Flux CD Resource Dependencies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Flux Kustomize Controller
- Flux Helm Controller
- Kubernetes custom resources
- GitOps deployment ordering

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `tree kustomization` reference: https://fluxcd.io/flux/cmd/flux_tree_kustomization/

## Issues Found
- The post stated that `spec.dependsOn` accepts references to Kustomization or HelmRelease resources interchangeably. Flux APIs define Kustomization dependencies as references to Kustomization resources and HelmRelease dependencies as references to HelmRelease resources, so the text was corrected to describe same-kind dependencies.
- The HelmRelease section said Kustomization and HelmRelease dependencies could be mixed in the same namespace. This was corrected to state that HelmRelease `dependsOn` is for HelmRelease-to-HelmRelease ordering, and that mixed sequencing should be expressed by putting HelmRelease manifests inside ordered Kustomizations.
- The cross-namespace section said dependencies must be in the same namespace. Current Flux API references include an optional `namespace` field on dependency references, defaulting to the referring resource's namespace. The text and example were updated to show `dependsOn[].namespace`.

## Review Notes
The Flux CLI command `flux tree kustomization flux-system` matches the official CLI reference, but the command is marked as preview in the Flux documentation. The local environment did not have the `flux` CLI installed, so CLI verification used the official Flux CLI documentation.
