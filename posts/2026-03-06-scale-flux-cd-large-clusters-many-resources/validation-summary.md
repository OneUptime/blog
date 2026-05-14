# Validation Summary: How to Scale Flux CD for Large Clusters with Many Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps Toolkit GitRepository and Kustomization APIs
- Flux controller sharding
- Prometheus metrics
- Kubernetes Deployment scheduling, resources, node selectors, tolerations, and topology spread constraints

## Sources Consulted
- Flux Prometheus metrics: https://fluxcd.io/flux/monitoring/metrics/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux sharding and horizontal scaling: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux bootstrap customization: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux v2.8.7 release notes: https://github.com/fluxcd/flux2/releases/tag/v2.8.7

## Issues Found
- Replaced the `workqueue_depth` metric example with the documented Flux/controller-runtime metric `workqueue_longest_running_processor_seconds`, because the current Flux metrics documentation lists the latter for controller runtime queue monitoring.
- Fixed the GitRepository `.spec.ignore` example so it unignores parent directories before unignoring `clusters/production/**`; otherwise gitignore-style negation may not include files under an ignored parent directory.
- Moved the per-tenant Kustomizations into the same namespaces as their GitRepository sources and tenant service accounts, because this matches Flux multi-tenancy lockdown guidance and avoids relying on cross-namespace source references.
- Removed `--kube-api-qps` and `--kube-api-burst` from controller argument examples because the current official Flux controller options pages no longer document those flags for source-controller, kustomize-controller, or helm-controller.
- Updated the sharding example to say that generated source-controller, kustomize-controller, and helm-controller deployments should be patched for production sharding, matching the official sharding guidance.
- Updated the sharding resource examples to label both GitRepository sources and their consuming Kustomizations, as required by the official sharding documentation.
- Updated the kustomize-controller image tag from `v1.4.0` to `v1.8.5`, the kustomize-controller version listed in the latest Flux v2.8.7 release notes on May 12, 2026.

## Review Notes
The controller resource values and concurrency numbers are examples, not universal recommendations. They should be load-tested per cluster, and current Flux installations should prefer patching generated controller manifests through Flux bootstrap or Flux Operator configuration rather than hand-authoring complete replacement Deployments.
