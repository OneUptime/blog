# Validation Summary: How to Run Flux CD in a Namespace Other Than flux-system

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Kustomize
- GitOps Toolkit custom resources
- Kubernetes RBAC, Secrets, and ConfigMaps

## Sources Consulted
- Flux CLI `flux bootstrap github` documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CLI `flux install` documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI `flux check` documentation: https://fluxcd.io/flux/cmd/flux_check/
- Flux CLI `flux export` documentation: https://fluxcd.io/flux/cmd/flux_export/
- Flux CLI `flux export source git` documentation: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux CLI `flux export kustomization` documentation: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux CLI `flux export helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_export_helmrelease/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The migration example used `flux export helmrelease --all --all-namespaces`, but current Flux `export` commands do not provide `--all-namespaces`; they are scoped with `--namespace`. Updated the export commands to include `--namespace=flux-system` and added a note to repeat the export/apply steps for Flux resources in other namespaces.

## Review Notes
- The local environment did not have `flux` or `kubectl` installed, so CLI validation was performed against the current official Flux and Kubernetes documentation.
- The Flux custom resource API versions used in the examples, including `source.toolkit.fluxcd.io/v1` and `kustomize.toolkit.fluxcd.io/v1`, are current.
- The post's statements about `--watch-all-namespaces`, same-namespace Secret references, and `targetNamespace` behavior are consistent with the official Flux documentation.
