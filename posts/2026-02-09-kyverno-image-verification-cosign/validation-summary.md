# Validation Summary: How to Implement Kyverno Image Verification with Cosign Signatures

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Kyverno ClusterPolicy image verification
- Sigstore Cosign
- Container image signatures
- Keyless signing with Fulcio and Rekor
- In-toto/SLSA attestations
- Vulnerability scan attestations

## Sources Consulted
- Kyverno documentation: Verify Images overview, https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno documentation: Sigstore image verification, https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno documentation: Policy settings and deprecated fields, https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno documentation: ImageValidatingPolicy, https://kyverno.io/docs/policy-types/image-validating-policy/
- Sigstore documentation: Signing with self-managed keys, https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/
- Sigstore documentation: Verifying signatures, https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore documentation: In-toto attestations, https://docs.sigstore.dev/cosign/verifying/attestation/

## Issues Found
- The policy examples used deprecated policy-level `validationFailureAction`, `webhookTimeoutSeconds`, and `failurePolicy` fields. Updated the examples to use `spec.webhookConfiguration.timeoutSeconds`, `spec.webhookConfiguration.failurePolicy`, and per-`verifyImages` `failureAction: Enforce`.
- Secret-backed public key examples omitted the key name inside the Kubernetes Secret. Added `key: cosign.pub` so the examples match the secret created with `kubectl create secret generic cosign-pub-key --from-file=cosign.pub`.
- The keyless verification example used a wildcard in `subject`, which is intended for exact identity matching. Changed it to `subjectRegExp` for pattern matching.
- The testing commands used `nginx:latest`, which did not match the sample `registry.example.com/*` policies and would imply signing an official Docker Hub image repository. Updated the commands to use `registry.example.com/app:*` images that match the policy scope.
- The introduction claimed image verification requires no CI/CD pipeline changes. Adjusted the wording because enforcing signed images usually requires adding image signing to CI/CD unless images are already signed.

## Review Notes
The post remains based on Kyverno `ClusterPolicy` verifyImages examples, which are still documented but appear under Kyverno's deprecated ClusterPolicy policy type in current documentation. For a future larger update, consider migrating examples to the stable `ImageValidatingPolicy` API introduced for image verification in Kyverno v1.18.
