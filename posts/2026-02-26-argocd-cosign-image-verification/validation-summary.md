# Validation Summary: How to Use Cosign with ArgoCD for Image Verification

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Sigstore Cosign
- Argo CD resource hooks
- Kubernetes Jobs, Secrets, ConfigMaps, ServiceAccounts, and Namespaces
- Tekton Tasks
- Kaniko
- AWS KMS, Google Cloud KMS, and Azure Key Vault
- Connaisseur admission controller
- Kyverno image verification policies
- OneUptime

## Sources Consulted
- Sigstore Cosign key management documentation: https://docs.sigstore.dev/cosign/key_management/overview/
- Sigstore Cosign signing containers documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign verifying signatures documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign in-toto attestations documentation: https://docs.sigstore.dev/cosign/verifying/attestation/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Kyverno verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification documentation: https://main.kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Connaisseur basics and Helm values documentation: https://sse-secure-systems.github.io/connaisseur/v3.8.0/basics/
- Connaisseur namespaced validation documentation: https://sse-secure-systems.github.io/connaisseur/v3.0.0/features/namespaced_validation/

## Issues Found
- Corrected the description of how Cosign stores signatures. Cosign stores signatures in the registry associated with an image digest rather than modifying the original image manifest.
- Updated AWS KMS examples to use an alias for key generation, because Cosign documentation notes key creation is not supported with AWS Key ARN or Key ID formats.
- Updated the Google Cloud KMS example to include the `cryptoKeys/.../versions/...` URI component shown in the Cosign KMS documentation.
- Added `--yes` to CI signing and attestation commands so the Cosign commands are suitable for non-interactive CI execution.
- Replaced an undefined `${GIT_COMMIT}` shell variable in the Tekton Task with a declared `commitSha` parameter.
- Changed the CI section wording because the provided Tekton Task builds and signs images but does not run tests or scans.
- Replaced `echo -e` in the PreSync shell script with `printf '%b\n'` for portable `/bin/sh` behavior.
- Corrected the KMS verification example to use a plausible AWS KMS key ARN format.
- Fixed the Connaisseur Helm values by nesting validators, policy, and features under `application`, adding the referenced static `deny` validator, using documented `*:*` style image patterns, and moving namespaced validation to `application.features.namespacedValidation`.
- Corrected the Connaisseur namespace label to `securesystemsengineering.connaisseur/webhook: validate`.
- Updated the Kyverno image verification policy to put `failureAction: Enforce` on the `verifyImages` rule instead of using the deprecated top-level `validationFailureAction`.

## Review Notes
The Argo CD PreSync hook pattern is technically valid, but it depends on maintaining an accurate image list in the hook. For stronger coverage, a future revision could derive image references from rendered manifests or rely primarily on admission control enforcement.
