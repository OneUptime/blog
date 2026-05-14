# Validation Summary: How to Configure Flux CD Resource Cache Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize patches
- Flux source-controller
- Flux kustomize-controller
- Flux helm-controller
- HelmRelease custom resources
- Prometheus and PromQL
- Go runtime garbage collection settings

## Sources Consulted
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux installation documentation: https://fluxcd.io/flux/installation/

## Issues Found
- The namespace-watching section said `--watch-all-namespaces=false` watches selected namespaces. Flux documents this flag as limiting a controller to its runtime namespace, so the heading, comments, and best-practice text were corrected.
- The cache sync period section used `--watch-label-selector`, but Flux documents that flag as a label selector for watched custom resources, commonly used for sharding. The section was corrected to describe label-selector cache scope instead of cache resync timing.
- The HelmRelease history example said the default `maxHistory` is 10. Current Flux HelmRelease documentation says the default is 5, so the comment was corrected.
- The sharding example manually created a second `source-controller` Deployment without Flux's generated RBAC, service account, service, and standard controller configuration. It was replaced with a Kustomize overlay pattern matching Flux's documented sharding guidance.
- The sharding resource labels included a `shard-a` resource even though the corrected example only configured `shard-b`. The example was made internally consistent by showing a `shard-b` resource.

## Review Notes
The remaining examples are configuration patterns that should be adapted to the exact Flux-generated manifests in a target cluster. Patches that replace full `args`, `volumes`, or `volumeMounts` arrays can need adjustment when upgrading Flux because generated controller manifests may change between releases.
