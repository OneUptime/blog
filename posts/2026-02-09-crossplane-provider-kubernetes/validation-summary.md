# Validation Summary: How to Use Crossplane Provider-K8s for Managing In-Cluster Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Crossplane provider-kubernetes
- Crossplane Compositions and XRDs
- Function Patch and Transform
- Kubernetes manifests
- Helm
- kubectl

## Sources Consulted
- Crossplane install documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane provider package documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane composition documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane v2 upgrade and legacy XRD behavior documentation: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- provider-kubernetes upstream README: https://github.com/crossplane-contrib/provider-kubernetes
- provider-kubernetes v1alpha2 API reference: https://pkg.go.dev/github.com/crossplane-contrib/provider-kubernetes/apis/object/v1alpha2

## Issues Found
- The provider install used the old `xpkg.upbound.io` package path and `v0.11.0`. Updated it to `xpkg.crossplane.io/crossplane-contrib/provider-kubernetes:v1.2.1`, matching the current upstream package location and latest release noted by the provider project.
- The Helm install flow did not update the local chart cache. Added `helm repo update`, matching the current Crossplane install docs.
- The composition examples used legacy `spec.resources` mode. Converted them to `mode: Pipeline` with Function Patch and Transform input, and added the required Function installation.
- The same-cluster `InjectedIdentity` example did not grant the provider service account permissions. Added the RBAC binding command and clarified that the service account needs permissions for managed resources.
- The composed provider-kubernetes `Object` resources did not reference the configured `ProviderConfig`, so they would rely on a missing default config. Added `providerConfigRef: kubernetes-provider` to the composed Object bases.
- The dependency example referenced a composition resource name as if it were the actual provider-kubernetes `Object` resource name. Added explicit composed `Object` names and updated the references to use those names.
- The XRD with `claimNames` did not state its legacy scope. Added `scope: LegacyCluster` to make the v1 claim-based example explicit for Crossplane v2 compatibility.

## Review Notes
The examples still use v1-style XRDs and claims intentionally. Crossplane v2 supports these through legacy compatibility, but new designs should usually consider v2 XRDs with `scope: Namespaced` where claims are not needed. Local `kubectl` and `helm` binaries were not available in the review environment, so command verification was done against official documentation rather than local CLI help.
