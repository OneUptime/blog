# Validation Summary: How to Configure Flux CD with Image Verification Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation and ImagePolicy
- Kubernetes admission control
- Kyverno ClusterPolicy image verification
- OPA Gatekeeper ConstraintTemplate and constraints
- Cosign and Sigstore keyless/key-pair signing
- GitHub Actions OIDC signing workflow

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image reflector API reference: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Kyverno image verification overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno ImageValidatingPolicy documentation: https://kyverno.io/docs/policy-types/image-validating-policy/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno require image checksum sample policy: https://kyverno.io/policies/other/require-image-checksum/require-image-checksum/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Sigstore Cosign signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign quickstart: https://docs.sigstore.dev/quickstart/quickstart-cosign/
- Sigstore OIDC verification cheat sheet: https://docs.sigstore.dev/quickstart/verification-cheat-sheet/

## Issues Found
- Clarified the Kyverno policy API status. Kyverno's current documentation marks `ClusterPolicy` as deprecated and provides `ImageValidatingPolicy` as the newer stable image verification API, while still documenting `ClusterPolicy` `verifyImages` examples. Updated the Step 2 introduction to make that status clear without changing the existing working example.

## Review Notes
- The Flux `ImagePolicy` example uses the current `image.toolkit.fluxcd.io/v1` API, and `digestReflectionPolicy: IfNotPresent` is valid.
- The Gatekeeper example is a registry and digest-reference policy, not cryptographic Cosign verification; the post states that correctly.
- The Kyverno digest requirement pattern matches the official Kyverno sample style for requiring checksum/digest image references.
- For future modernization, the Kyverno examples could be migrated from `ClusterPolicy` `verifyImages` to the stable `policies.kyverno.io/v1` `ImageValidatingPolicy` API.
