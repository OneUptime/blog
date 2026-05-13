# Validation Summary: How to Exclude Resources from Garbage Collection in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Flux Kustomization garbage collection and pruning
- Kubernetes resources, labels, and annotations
- Kustomize patches
- Kubernetes StatefulSets and PersistentVolumeClaims

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux FAQ on disabling garbage collection during Kustomization moves: https://fluxcd.io/flux/faq/
- Kustomize patches reference: https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/patches.md
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The StatefulSet example incorrectly implied that adding `kustomize.toolkit.fluxcd.io/prune: disabled` to `volumeClaimTemplates` is what prevents Flux from pruning StatefulSet-created PVCs. Flux prunes resources it applied and tracks in the Kustomization inventory; PVCs from `volumeClaimTemplates` are created by the Kubernetes StatefulSet controller. I changed the example to use a PersistentVolumeClaim applied directly by Flux and mounted by the StatefulSet.
- The text about StatefulSet `volumeClaimTemplates` was updated to explain that Kubernetes `persistentVolumeClaimRetentionPolicy`, not Flux pruning, controls deletion of PVCs created by a StatefulSet. The default Kubernetes behavior is to retain those PVCs when the StatefulSet is deleted.
- The verification section said prune-disabled resources will still appear in inventory. I softened this to describe inventory as Flux's tracking mechanism and the prune-disabled annotation as a skip signal during pruning, avoiding an over-specific claim about inventory contents after removal from source.

## Review Notes
The core Flux prune annotation, Kustomization `prune: true` behavior, Flux reconcile command form, and Kustomize patch examples were consistent with the current official documentation. A local Flux or kubectl binary was not available in the review environment; Kustomize patch behavior was additionally checked with the official `registry.k8s.io/kustomize/kustomize:v5.4.2` container image.
