# Validation Summary: How to Use Dapr with Crossplane Compositions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane (CompositeResourceDefinitions, Compositions, patches)
- Crossplane Kubernetes Provider (Object resource)
- Crossplane GCP Provider (Redis/Memorystore)
- Dapr (Component manifests, state store)
- Dapr JavaScript SDK (`@dapr/dapr` v3.x)
- Kubernetes

## Sources Consulted
- Crossplane Composite Resource Definitions docs: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane Compositions docs: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform docs: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane provider-kubernetes GitHub (Object CRD, API versions): https://github.com/crossplane-contrib/provider-kubernetes
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr JavaScript SDK source (DaprClient constructor, state API): https://github.com/dapr/js-sdk

## Issues Found

1. **Cross-resource patching bug (Critical)**: The `dapr-component` resource had `fromFieldPath: status.atProvider.host`, which reads from the composite resource (XR). However, `status.atProvider.host` only exists on the managed redis-instance resource, not on the XR. Crossplane cannot patch directly between composed resources — values must hop through the XR. **Fix**: Added a `ToCompositeFieldPath` patch on the `redis-instance` resource to push `status.atProvider.host` to `status.redisHost` on the XR, and updated the `dapr-component` patch to read from `status.redisHost`.

2. **Missing `type: Format` in string transform**: The string transform under the `redis-instance` patches was missing the required `type: Format` field inside the `string` block. Per Crossplane's schema, `string.type` is a required field. **Fix**: Added `type: Format` to the string transform.

3. **Deprecated Kubernetes Provider Object API version**: The `dapr-component` resource used `apiVersion: kubernetes.crossplane.io/v1alpha1`, which is deprecated. The current storage version is `v1alpha2`. **Fix**: Updated to `kubernetes.crossplane.io/v1alpha2`.

4. **`redisHost` missing port in `host:port` format**: Dapr's Redis state store requires `redisHost` in `host:port` format (e.g., `localhost:6379`), not just the hostname. The original patch only set the host without the port. **Fix**: Added a string Format transform to append `:6379` (GCP Memorystore default port) to the host value.

## Review Notes
- The Crossplane Composition uses the legacy `resources`-based format directly in the Composition spec. Modern Crossplane (v2.x) prefers `mode: Pipeline` with composition functions like `function-patch-and-transform`. The legacy format still works but may be deprecated in future versions. A future revision could update to the pipeline-based approach.
- The Dapr JS SDK constructor syntax (`new DaprClient({ daprHost, daprPort })`) is specific to v3.x of the `@dapr/dapr` package. The post doesn't specify the SDK version — readers using v2.x would need the older positional-argument constructor.
- The `redisPassword` field is not included in the Dapr component metadata. For GCP Memorystore instances with AUTH enabled, this would be needed. The example works for basic/no-auth setups.
