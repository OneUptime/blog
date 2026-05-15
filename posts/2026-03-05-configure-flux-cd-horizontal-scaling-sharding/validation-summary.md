# Validation Summary: How to Configure Flux CD Horizontal Scaling with Sharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Flux source-controller
- Flux kustomize-controller
- Flux helm-controller
- Flux controller sharding

## Sources Consulted
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post said the guide would create two additional shards, but the implementation only defined `shard1`. I changed this to say the guide creates one additional shard and that more shard directories can be added with the same pattern.
- The explanation said unlabeled resources are handled by the default controller without noting that the default controllers must first be configured to exclude labeled shard resources. I clarified that this behavior applies when the default controllers use the negated shard selector.
- The apply command targeted only `clusters/my-cluster/flux-system/shard1/`, which would not apply the parent kustomization patch that excludes sharded resources from the default controllers. I changed the command to apply `clusters/my-cluster/flux-system/` so the shard and default-controller exclusion are applied together.
- The log verification command for default controllers could be misread as expecting a match. I clarified in the comment that it should print no lines.

## Review Notes
The main sharding overlay, `--watch-label-selector` usage, `sharding.fluxcd.io/key` label, source-controller service selector patch, `--storage-adv-addr` patch, and exclusion of `notification-controller` and `source-watcher` match the current official Flux sharding documentation. The Helm generated `HelmChart` label note is correct; future examples could include the documented `.spec.chart.metadata.labels` snippet if the post expands the Helm section.
