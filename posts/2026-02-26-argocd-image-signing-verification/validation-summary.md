# Validation Summary: How to Enforce Image Signing Verification with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kyverno
- Cosign
- Sigstore and Rekor
- GitHub Actions
- Trivy
- Helm
- Argo CD Notifications

## Sources Consulted
- Sigstore Cosign self-managed key documentation: https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/
- Sigstore Cosign KMS key management overview: https://docs.sigstore.dev/cosign/key_management/overview/
- Sigstore Cosign container signing documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore OIDC verification cheat sheet: https://docs.sigstore.dev/quickstart/verification-cheat-sheet/
- Sigstore Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Kyverno installation and Helm documentation: https://kyverno.io/docs/installation/installation/
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno ImageValidatingPolicy documentation: https://kyverno.io/docs/policy-types/image-validating-policy/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Slack notification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Trivy cosign vulnerability attestation documentation: https://trivy.dev/docs/v0.52/tutorials/signing/vuln-attestation/
- Kyverno Helm chart index: https://kyverno.github.io/kyverno/index.yaml

## Issues Found
- The AWS KMS key generation example used a key ARN with `cosign generate-key-pair`. Cosign documents that AWS KMS key creation is not supported with key ARN or key ID formats, so the example was changed to use an AWS KMS alias URI.
- The GitHub Actions workflow did not declare `id-token: write`, which is required for keyless Sigstore signing from GitHub Actions. Added workflow permissions.
- The Cosign signing and attestation commands were not CI-friendly because recent Cosign versions prompt for confirmation when publishing transparency log entries. Added `--yes`.
- The Kyverno Helm chart version and values were outdated. Updated the chart to `3.8.1` and replaced invalid top-level `replicaCount`, `resources`, and `webhookEnabled` values with current controller-specific values.
- The Kyverno policies used deprecated top-level `validationFailureAction`, `webhookTimeoutSeconds`, and `failurePolicy` placement. Updated the examples to use `webhookConfiguration` and per-image `failureAction`.
- The keyless signing command manually set `--oidc-issuer` for GitHub Actions. Current Cosign keyless signing uses the GitHub Actions OIDC token when `id-token: write` is available, so the command was simplified.
- The keyless verification identity was too broad and did not match the documented GitHub Actions workflow identity shape. Changed it to a workflow-specific subject.
- The PreSync hook used `bitnami/cosign:latest` and a shell loop. Replaced it with the signed upstream Cosign container image and `cosign verify` arguments, avoiding an unpinned third-party `latest` image.
- The summary mentioned OPA Gatekeeper as if it were equivalent to Kyverno for this workflow. Changed that wording to "another admission controller" to avoid overstating native Gatekeeper support.

## Review Notes
The corrected Kyverno examples use the documented `ClusterPolicy` `verifyImages` flow, which remains functional, but Kyverno 1.18 marks `ClusterPolicy` as a deprecated policy type and introduces stable `ImageValidatingPolicy` for image verification. A future article refresh should consider migrating the policy examples to `policies.kyverno.io/v1` `ImageValidatingPolicy`.
