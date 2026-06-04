# Validation Summary: How to Set Up Cosign Image Signing and Verification

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Sigstore Cosign
- Kubernetes admission webhooks
- Kyverno ClusterPolicy image verification
- GitHub Actions
- Prometheus alerting
- Go

## Sources Consulted
- Cosign project documentation and README: https://github.com/sigstore/cosign
- Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Cosign GitHub Action documentation: https://github.com/sigstore/cosign-installer
- Cosign Go package documentation: https://pkg.go.dev/github.com/sigstore/cosign/v3/pkg/cosign
- Cosign signature package documentation: https://pkg.go.dev/github.com/sigstore/cosign/v3/pkg/signature
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/

## Issues Found
- The Kubernetes Secret example stored both the private and public Cosign keys in the cluster for admission verification. Updated it to store only `cosign.pub`, because Kyverno verification only needs the public key and Kyverno's documented Secret reference expects a `cosign.pub` key.
- Several Kyverno examples used older policy-level `validationFailureAction` and `webhookTimeoutSeconds` fields. Updated the examples to use `spec.webhookConfiguration.timeoutSeconds` and per-image `failureAction: Enforce`, matching current Kyverno examples.
- The Kyverno Secret examples used an invalid nested `keys.secret.name/namespace` shape. Replaced them with documented `publicKeys: k8s://<namespace>/<secret_name>` references.
- The keyless Kyverno example used a wildcard in `subject`. Updated it to `subjectRegExp` for pattern matching against GitHub workflow identities.
- The custom Go webhook imported Cosign v2 and called `remote.VerifyImageSignatures`, which is not the documented function location. Updated it to Cosign v3 imports, `signature.LoadPublicKeyRaw`, and `cosign.VerifyImageSignatures`.
- The custom webhook could panic on an AdmissionReview without a request and only checked regular containers. Added a nil request check and included init containers in verification.
- The GitHub Actions example used older action majors and omitted non-interactive signing. Updated to `actions/checkout@v4`, `docker/login-action@v3`, `sigstore/cosign-installer@v4`, removed unnecessary `id-token: write` from the key-based workflow, and added `cosign sign --yes`.
- The Prometheus alert used the older `kyverno_policy_results_total` metric and `policy_result` label. Updated it to `kyverno_policy_results` with `rule_result="fail"` per current Kyverno metrics documentation.

## Review Notes
Kyverno's `ClusterPolicy` verifyImages examples are still documented, but current Kyverno documentation marks ClusterPolicy as deprecated in favor of newer CEL-based policy types such as `ImageValidatingPolicy`. A future modernization pass could migrate the tutorial to `ImageValidatingPolicy`, but the corrected ClusterPolicy examples now match Kyverno's documented compatibility examples.
