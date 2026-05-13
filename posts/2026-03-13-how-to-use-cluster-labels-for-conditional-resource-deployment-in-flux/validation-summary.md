# Validation Summary: How to Use Cluster Labels for Conditional Resource Deployment in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization resources
- Flux post-build variable substitution
- Flux notification alerts
- Kubernetes ConfigMaps
- kubectl
- Kustomize overlays and components
- HelmRelease resources

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux monitoring alerts documentation: https://fluxcd.io/flux/monitoring/alerts/
- Kubernetes kubectl config use-context reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_use-context/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes-sigs Kustomize repository documentation: https://github.com/kubernetes-sigs/kustomize

## Issues Found
- The Step 2 Flux Kustomization example used `${CLUSTER_NAME}` in `spec.path`, implying that `postBuild.substituteFrom` can choose the same Kustomization's build path dynamically. Flux post-build substitution runs after Kustomize builds the configured path, so it cannot substitute the path that is being built. I changed the example to use a concrete profile path and clarified that the path should be chosen per cluster while substitution is used inside rendered manifests.
- The introduction described the pattern as using "cluster labels" directly in Flux. Flux does not select clusters by label in this pattern; the values are cluster metadata stored in a ConfigMap and consumed as substitution variables. I changed this wording to "cluster metadata" to avoid implying native cluster label selection.
- Step 8 said to create conditional resources using substitution in annotations or labels, but the example actually shows a separate feature-specific Kustomization that is included only for GPU-enabled clusters. I updated the wording to match the example and Flux behavior.
- The best-practices section said Flux alerts can catch missing expected labels. By default, undefined post-build variables are substituted with empty strings unless defaults are provided; Flux recommends `StrictPostBuildSubstitutions` to fail on missing variables. I updated the recommendation to pair alerts with `--feature-gates=StrictPostBuildSubstitutions=true`.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, but the current Flux notification Alert examples use `notification.toolkit.fluxcd.io/v1beta3`. I updated the API version.

## Review Notes
- Kustomize components are still described by Flux as an alpha/experimental Kustomize feature. The post's component examples are technically valid, but readers should account for that caveat in production workflows.
- The kubectl commands and ConfigMap examples are syntactically valid.
