# Validation Summary: How to Configure HelmRelease ValuesFrom ConfigMap in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Kubernetes HelmRelease custom resources
- Kubernetes ConfigMaps
- Helm
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Kubernetes generated kubectl reference for `kubectl create configmap`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Helm documentation for `helm get values`: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The merge order section stated that inline `spec.values` overrides everything. Flux documentation confirms inline values normally override values references, but a `valuesFrom` entry with `targetPath` overwrites previous values at that path, including inline values. Updated the merge-order wording and added a short caveat after the list.

## Review Notes
The local environment did not have `kubectl`, `flux`, or `helm` installed, so CLI verification was performed against official command documentation instead of local `--help` output. The `valuesFrom`, `valuesKey`, `targetPath`, and `optional` fields are current for `helm.toolkit.fluxcd.io/v2`.
