# Validation Summary: How to Enable Garbage Collection in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kubernetes
- kubectl
- Flux CLI
- Kustomize

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The post said Flux garbage collection relies on labels that Flux automatically applies to every managed resource. Flux's official documentation describes garbage collection tracking through the Kustomization `.status.inventory`, so this was corrected to avoid implying label-based ownership tracking.
- The post described `prune: false` as the default. The current Flux Kustomization API documents `.spec.prune` as a required boolean field, so this was changed to describe the behavior when `prune` is explicitly set to `false`.
- The post said enabling `prune: true` on an existing Kustomization will not immediately delete anything. Because Flux compares current source output with the stored inventory during reconciliation, stale inventoried resources that are no longer present in Git can be pruned after enabling it. This was corrected.
- The conclusion suggested using labels or annotations to protect resources but did not name the required key/value. This was made explicit as `kustomize.toolkit.fluxcd.io/prune: disabled`.

## Review Notes
The YAML examples use the current `kustomize.toolkit.fluxcd.io/v1` Kustomization API and valid Kubernetes Deployment and Service manifests. The `kubectl events --for` and `flux reconcile kustomization` commands match current official CLI documentation.
