# Validation Summary: How to Configure Flux Controller Sharding by Label Selector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Flux kustomize-controller
- Flux source-controller
- Flux helm-controller
- Kubernetes labels and label selectors
- kubectl

## Sources Consulted
- Flux official documentation: Flux sharding and horizontal scaling, https://fluxcd.io/flux/installation/configuration/sharding/
- Flux official documentation: Kustomize Controller options, https://fluxcd.io/flux/components/kustomize/options/
- Kubernetes official documentation: Labels and Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The post originally said "Flux controllers" broadly support `--watch-label-selector`, but Flux's official sharding documentation identifies source-controller, kustomize-controller, and helm-controller as the shardable controllers and excludes notification-controller and source-watcher. Updated the wording to name the supported controller families.
- The controller Deployment examples only create additional kustomize-controller instances, while the post described the step as creating generic controller instances. Updated the wording to make the example scope explicit.
- The post said to apply shard labels to "Kustomization or HelmRelease" resources, but sharding Helm workloads also requires sharding and labeling the related source-controller and helm-controller resources, including generated HelmChart metadata. Updated the note to avoid implying that labeling only a HelmRelease is sufficient.
- The set-based selector example used spaces and parentheses in an unquoted shell-style flag. Quoted the selector value so the example is safe to paste into a shell command.

## Review Notes
- The tutorial remains focused on kustomize-controller sharding. A future expansion could show the official Kustomize overlay approach for generating source-controller, kustomize-controller, and helm-controller shards together.
