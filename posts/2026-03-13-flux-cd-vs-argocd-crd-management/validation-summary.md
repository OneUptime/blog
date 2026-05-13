# Validation Summary: Flux CD vs ArgoCD: Which Handles CRDs Better

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD Kustomize Controller
- Flux CD Helm Controller
- Argo CD
- Kubernetes CustomResourceDefinitions
- Helm charts
- cert-manager

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD declarative setup resource exclusions documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/declarative-setup/
- cert-manager Helm installation documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager upgrade documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/upgrade/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The post implied Flux Helm Controller CRD policies apply generally to cert-manager Helm installs. cert-manager v1.14 templates CRDs behind `installCRDs=true` instead of using Helm's standard `crds/` directory, while Flux's `install.crds` and `upgrade.crds` policies apply to charts using `crds/`. Updated the text and example to distinguish generic Helm CRD handling from cert-manager-specific chart behavior.
- The Flux Kustomize explanation compared its ordering directly to `kubectl apply`. Flux documentation describes server-side apply behavior and CRD staging, so the wording was corrected to say Flux stages CRDs before other resources during apply.
- The Argo CD CRD example used `PreSync` plus `hook-delete-policy: HookSucceeded` on a CRD. That is unsafe because hook cleanup can delete the CRD, and Kubernetes deletes stored custom resources when a CRD is deleted. Replaced the hook/delete-policy guidance with sync-wave ordering and `Prune=false`.
- The Argo CD Application example omitted `spec.destination`, which is required for a complete Application manifest. Added an in-cluster destination and `cert-manager` namespace.
- The post described `Replace=true` as the Argo CD mechanism for CRD replacement. Argo CD documents `Replace=true` as switching from `kubectl apply` to `kubectl replace/create` and warns it can be destructive; it is not CRD-specific pruning protection. Removed it from the example and replaced the comparison/conclusion with sync-wave plus `Prune=false` guidance.
- The post recommended Argo CD `resource.exclusions` as pruning protection for CRDs. Official documentation states exclusions make Argo CD ignore matching resources for discovery and sync, which is broader than prune protection. Replaced this with the official per-resource `argocd.argoproj.io/sync-options: Prune=false` option.

## Review Notes
The post is now technically accurate for the Flux and Argo CD mechanisms discussed. Future improvements could include separate examples for cert-manager's Helm value-based CRD installation and a different operator chart that uses Helm's standard `crds/` directory, but that would be an expansion rather than a correctness fix.
