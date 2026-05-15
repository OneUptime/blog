# Validation Summary: How Flux CD Handles CRD Installation and Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux HelmRelease
- Helm
- Kubernetes CustomResourceDefinitions
- Kubernetes storage version migration
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Helm Custom Resource Definitions best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Kubernetes CustomResourceDefinitions documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes CRD versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes storage version migration documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/storage-version-migration/

## Issues Found
- The CRD storage-version upgrade guidance said existing resources need to be migrated whenever a CRD introduces a new storage version. Kubernetes does not rewrite existing stored objects immediately when the storage version changes; migration is required before removing the old stored version. Updated the wording to reflect that sequence.

## Review Notes
The Flux `dependsOn` examples, HelmRelease CRD policy fields, Helm CRD lifecycle explanation, `prune: false` guidance for CRDs, and the `kubectl get` examples are consistent with the official documentation reviewed. Local CLI validation with `kubectl` was not possible because `kubectl` is not installed in this workspace.
