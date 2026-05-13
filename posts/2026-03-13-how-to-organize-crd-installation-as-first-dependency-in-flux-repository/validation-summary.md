# Validation Summary: How to Organize CRD Installation as First Dependency in Flux Repository

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux Kustomization
- Flux HelmRelease
- Flux OCIRepository
- Kubernetes CustomResourceDefinitions
- Kustomize
- cert-manager
- Prometheus Operator CRDs
- kubectl
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/
- cert-manager Helm installation documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/helm/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Flux CLI get kustomizations reference: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- The cert-manager example said a HelmRelease installs both the controller and CRDs unconditionally. Updated it to clarify that cert-manager CRDs are installed by Helm only when CRD installation is enabled.
- The OCI artifacts section showed a local Kustomize resource list rather than a Flux OCI artifact configuration. Replaced it with an `OCIRepository` plus Flux `Kustomization` example using `sourceRef.kind: OCIRepository`.
- The CRD cleanup section said old CRD versions would not be removed automatically because `prune: false` was set. Updated the wording to refer to CRD objects removed from the `crds/` directory, because `prune` controls deletion of removed objects, not individual versions inside a CRD schema.

## Review Notes
- The Flux `dependsOn`, `wait`, `prune`, `sourceRef`, and HelmRelease `install.crds` / `upgrade.crds` fields match current Flux documentation.
- Deleting a CRD deletes the custom resources stored for that CRD, matching Kubernetes documentation.
- The cert-manager v1.14.0 CRD URL and the Prometheus Operator v0.72.0 raw CRD URLs resolved successfully during review.
- cert-manager v1.14.0 is an older example version, but the version-specific URL is valid and the post does not claim it is the latest release.
