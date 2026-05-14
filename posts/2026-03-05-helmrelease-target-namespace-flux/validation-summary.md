# Validation Summary: How to Configure HelmRelease Target Namespace in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Kubernetes
- Helm
- HelmRelease custom resources
- Kubernetes namespaces

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Helm command documentation: https://helm.sh/docs/helm/
- Kubernetes namespace documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The post incorrectly stated that Helm release metadata is stored in the target namespace by default when `spec.targetNamespace` is set. Flux documentation states that `spec.storageNamespace` defaults to the HelmRelease namespace. Updated the storageNamespace section and verification commands to use `flux-system` as the default Helm storage namespace.
- The verification command used `flux get helmrelease`; the current official Flux CLI documentation uses `flux get helmreleases`. Updated the command.
- The post stated that all templated resources are created in the target namespace. Updated this to clarify that namespace-scoped chart resources without an explicit `metadata.namespace` are created there; cluster-scoped resources and resources with explicit namespaces are not necessarily created in the target namespace.
- The cross-namespace source reference explanation referred to a source access policy. Flux documents this behavior as controlled by the helm-controller `--no-cross-namespace-refs=true` flag. Updated the wording accordingly.

## Review Notes
- The examples use `apiVersion: helm.toolkit.fluxcd.io/v2`, which is current in the Flux documentation reviewed.
- `spec.chart.spec.sourceRef` remains documented and valid. Flux also supports newer `spec.chartRef` patterns for certain source objects, but this post's examples are still technically valid.
