# Validation Summary: How to Configure Istio with Crossplane

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Crossplane Compositions and CompositeResourceDefinitions
- Crossplane provider-kubernetes
- Istio VirtualService and DestinationRule
- Kubernetes RBAC
- Helm
- kubectl

## Sources Consulted
- Crossplane Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane Providers documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane upgrade to v2 documentation: https://docs.crossplane.io/master/guides/upgrade-to-crossplane-v2/
- Upbound Marketplace provider-kubernetes Object API documentation: https://marketplace.upbound.io/providers/crossplane-contrib/provider-kubernetes/v0.13.0/resources/kubernetes.crossplane.io/Object/v1alpha2
- provider-kubernetes release notes: https://github.com/crossplane-contrib/provider-kubernetes/releases
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/

## Issues Found
- The Kubernetes provider example used an outdated provider package version. Updated `provider-kubernetes` from `v0.13.0` to `v1.2.1`, while keeping the cluster-scoped `kubernetes.crossplane.io/v1alpha2` `Object` API that current provider-kubernetes releases continue to serve.
- The RBAC example bound permissions to a fixed `provider-kubernetes` service account, but the provider install snippet did not ensure that service account name would be used. Added a `DeploymentRuntimeConfig` and `runtimeConfigRef` so the RBAC subject matches the provider runtime.
- The Composition example used legacy native patch-and-transform syntax under `spec.resources`. Native patch-and-transform composition was deprecated in Crossplane v1.17 and removed in Crossplane v2, so the example would not work with current Crossplane releases. Added installation of `function-patch-and-transform` and converted the Composition to `mode: Pipeline` with `pt.fn.crossplane.io/v1beta1` `Resources` input.
- The XRD did not specify a default Composition, while the first claim example did not select one. Added `defaultCompositionRef.name: istio-service-standard` so the standard claim has an explicit default.
- The XRD used claim names but did not make the v1 compatibility scope explicit. Added `scope: LegacyCluster` to clarify that the claim-based example intentionally uses Crossplane's v1-style claim behavior on modern Crossplane.
- The premium Composition example also used the old native `resources` shape. Updated it to the current pipeline structure.

## Review Notes
The Istio `VirtualService` and `DestinationRule` fields used in the examples match the current Istio networking API references. The premium Composition remains illustrative and uses `resources: []`; a real premium tier should copy the standard resource templates and adjust the retry and outlier-detection values.
