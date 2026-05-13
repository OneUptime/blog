# Validation Summary: How to Assign Kustomizations to Specific Shard Controllers in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux Kustomization API
- Flux controller sharding
- Kubernetes labels and label selectors
- kubectl
- Kustomize patches
- Flux CLI

## Sources Consulted
- Flux sharding and horizontal scaling: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux reconcile kustomization CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes Kustomize patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The post did not state that shard label values must match the controller `--watch-label-selector`. Added a clarification and example selector so the `shard-1` labels are tied to the controller configuration.
- The static manifest example labeled only the Flux `Kustomization`. Flux's official sharding guidance labels both the Flux source and its `Kustomization` when source-controller is sharded. Added a `GitRepository` example with the same shard label and a note about labeling referenced Source objects.
- The post-build example loaded `SHARD_KEY` from a ConfigMap but did not use the variable anywhere, so it would not assign any shard labels. Changed the method to use Flux `commonMetadata.labels` with `${SHARD_KEY}`, which applies the label to rendered resources and then substitutes the value during post-build processing.

## Review Notes
- The kubectl label commands, label removal syntax, Kustomize JSON patch escaping with `~1`, label selector examples, and `flux reconcile kustomization` command were consistent with official documentation.
- The examples use `shard-1` style values, while Flux documentation commonly uses `shard1`. The value is acceptable as long as it exactly matches each shard controller's label selector.
