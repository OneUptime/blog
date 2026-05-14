# Validation Summary: How to Handle Kustomization Resource Conflicts in Flux

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Kubernetes server-side apply
- Kubernetes managed fields
- Kustomize
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux `flux events` CLI documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux `flux tree kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The post incorrectly stated that Flux `spec.force` can be used to force SSA field ownership. Flux documents `spec.force` as replacing resources when patching fails due to immutable field changes, not as an SSA conflict override. I replaced this guidance with deliberate ownership transfer advice and added a warning about the real `spec.force` behavior.
- The post showed a Kustomize patch with `resources: []` as a way for one Flux Kustomization to patch a resource created by another. Kustomize patches are applied during the same build and require a matching resource in that build output. I replaced this with a non-overlapping manifest example using Flux's documented `kustomize.toolkit.fluxcd.io/ssa: Merge` apply policy.
- The post claimed Flux exposes field manager configuration through `spec.commonMetadata` and related options. `spec.commonMetadata` sets labels and annotations, not field managers. I replaced the section with Flux's documented resource-level apply policy annotations.
- The post used `flux tree ks`; current Flux documentation describes the command as `flux tree kustomization`. I updated the command examples accordingly.
- The summary and diagnostic checklist recommended `force: true` as a conflict resolution strategy. I updated these references to recommend restructuring or deliberate field ownership transfer instead.

## Review Notes
The Flux CLI and `kubectl` binaries were not installed in the local environment, so command verification was done against official CLI documentation rather than local `--help` output. The post remains intentionally high-level; exact conflict messages may vary by Kubernetes and Flux versions.
