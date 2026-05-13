# Validation Summary: How to Configure Main Controller to Exclude Sharded Resources in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux controller sharding
- Kubernetes label selectors
- Kubernetes Deployments
- Kustomize patches
- kubectl

## Sources Consulted
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- Corrected the selector explanation for `key!=value`. Kubernetes label selector semantics match resources where the key is absent as well as resources where the key exists with a different value.
- Clarified controller wording to avoid implying that every Flux controller supports sharding. The official Flux documentation states that source-controller, kustomize-controller, and helm-controller support sharding.

## Review Notes
The Kustomize patch examples are valid JSON6902 patches, but replacing the full `args` list can drop newer default flags when Flux manifests change. The official Flux sharding documentation demonstrates adding `--watch-label-selector` to the existing argument list, which is usually easier to maintain across upgrades.
