# Validation Summary: How to Enforce Image Policy with Flux CD and Kyverno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Flux CD
- Flux HelmRelease, HelmRepository, Kustomization, Provider, and Alert APIs
- Kyverno
- Kyverno ClusterPolicy validation and verifyImages rules
- Sigstore Cosign image signatures
- Kubernetes PolicyReport and ClusterPolicyReport resources

## Sources Consulted
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno configuration documentation: https://kyverno.io/docs/installation/customization/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno policy reports documentation: https://kyverno.io/docs/policy-reports/background/
- Kyverno restrict image registries sample policy: https://kyverno.io/policies/best-practices/restrict-image-registries/restrict-image-registries/
- Kyverno disallow latest tag sample policy: https://release-1-13-0.kyverno.io/policies/best-practices/disallow-latest-tag/disallow-latest-tag/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The repository structure listed `require-labels-on-images.yaml`, but the post's policy section uses `restrict-pull-policy.yaml`. Updated the structure to match the actual policy file shown.
- The Kyverno Helm values included the old top-level `replicaCount` pattern. Removed it and kept controller-specific replica settings, adding cleanup and reports controller replicas to match Kyverno's HA installation guidance.
- Validation policies used policy-level `spec.validationFailureAction`, which current Kyverno documentation marks as deprecated. Moved the action to `validate.failureAction` in each validation rule and to `verifyImages[].failureAction` for image verification.
- The image registry and digest policies omitted `ephemeralContainers`. Added optional `ephemeralContainers` checks to keep coverage consistent across Kubernetes container types.
- The latest-tag policy used array overlay patterns that were less precise than Kyverno's documented `foreach` approach. Updated it to use `foreach` for containers, init containers, and ephemeral containers.
- The image pull policy description incorrectly implied that `imagePullPolicy` avoids unverified images or guarantees security patches. Reworded it to the accurate Kubernetes behavior: the kubelet checks the registry whenever a container starts.
- The test section said a `ghcr.io/myorg/app:v1.2.3` Pod would be created successfully, but the signature policy would block it unless it is signed by the configured key. Updated the expected result accordingly.
- The monitoring section claimed Flux notifications alert on Kyverno policy violations. Flux Alerts forward Flux object events, not Kyverno admission denials directly. Reworded the section to cover Flux reconciliation failures while applying Kyverno and policy manifests.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, while current Flux Alert examples and API documentation use `notification.toolkit.fluxcd.io/v1beta3`. Updated the Provider and Alert snippets.

## Review Notes
- The post still uses Kyverno `ClusterPolicy`, which current Kyverno documentation identifies as a legacy policy type in newer releases. The examples remain consistent with Kyverno's ClusterPolicy documentation and sample policies, but a future update could migrate image verification to `policies.kyverno.io/v1` `ImageValidatingPolicy` for Kyverno v1.18+.
