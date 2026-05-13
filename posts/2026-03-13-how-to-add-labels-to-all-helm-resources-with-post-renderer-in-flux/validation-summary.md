# Validation Summary: How to Add Labels to All Helm Resources with Post-Renderer in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- HelmRelease `helm.toolkit.fluxcd.io/v2`
- Kubernetes
- Helm post-renderers
- Kustomize patches
- Kubernetes labels and selectors
- kubectl

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization patches documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post used `spec.postRenderers.kustomize.commonLabels`, but the current Flux HelmRelease `v2` Kustomize post-renderer supports only `patches` and `images`. Replaced the all-resource label examples with `spec.commonMetadata.labels`, which Flux documents as the correct field for applying labels to every rendered Helm chart resource.
- The post claimed `commonLabels` propagation behavior for Flux HelmRelease post-renderers. Updated this to explain that `commonMetadata` applies metadata labels only and does not update selectors or Pod templates.
- The metadata-only JSON 6902 patch example targeted every kind and added individual keys under `/metadata/labels`. This can fail when a resource has no existing `metadata.labels` map, and it was unnecessary for all-resource metadata labels. Replaced the guidance with `commonMetadata`.
- The specific resource patch example used strategic merge patches to add metadata labels to Deployments and Services while saying it targeted specific resource labels. Updated the example to show supported post-renderer strategic merge patches for Deployment Pod template labels and Service metadata labels, plus a separate selector patch example with a warning about selector changes.

## Review Notes
Flux post-renderers are not applied to chart hooks due to Helm's current post-renderer limitation, so labels added through post-rendering may not affect hook resources. The verification command using `kubectl get all` is valid, but `all` does not include every Kubernetes resource type; it is best treated as a quick check rather than exhaustive validation.
