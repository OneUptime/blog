# Validation Summary: How to Verify Cosign Signatures from a Private Registry with Custom CAs and Credentials

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Sigstore Cosign 3.1.3
- OCI Image and Distribution 1.1 referrers
- Private container registries and registry token authentication
- TLS, private certificate authorities, and mutual TLS
- Sigstore trusted roots, Fulcio, and transparency logs
- Kubernetes registry credential providers
- Kyverno 1.18 private-registry image verification

## Sources Consulted

- [Cosign 3.1.3 verification command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign 3.1.3 registry login command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_login.md)
- [Cosign 3.1.3 registry authentication, TLS, mTLS, and keychain implementation](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/registry.go)
- [Cosign digest resolution implementation](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/oci/remote/digest.go)
- [Cosign signature retrieval implementation](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/oci/remote/signatures.go)
- [Cosign OCI referrer lookup implementation](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/oci/remote/referrers.go)
- [Cosign certificate-verification options](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/certificate.go)
- [Cosign standardized-bundle option compatibility checks](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/verify/common.go)
- [Cosign pull request #4836: honor `COSIGN_REPOSITORY` during OCI-bundle verification](https://github.com/sigstore/cosign/pull/4836)
- [Sigstore registry support and `COSIGN_REPOSITORY`](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Sigstore signature verification guide](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Sigstore custom-components and trusted-root guidance](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Sigstore client verification specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md#4-verification)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [CNCF Distribution registry token authentication](https://distribution.github.io/distribution/spec/auth/token/)
- [Kyverno image-verification registry credential documentation](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/)
- [Kyverno private-registry authentication and trust documentation](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/#using-private-registries)
- [Kubernetes private-registry and `imagePullSecrets` documentation](https://kubernetes.io/docs/concepts/containers/images/#using-a-private-registry)

## Issues Found

- The introduction said digest-pinned verification pulls the subject artifact. Corrected it to explain that Cosign uses a supplied digest directly, while a tag must be resolved through the registry; signature discovery and retrieval still require registry access.
- The alternate-signature-repository guidance omitted that `COSIGN_REPOSITORY` is an out-of-band mapping that must also be configured during verification. Added that requirement and the Cosign 3.1.0 minimum for reliable OCI-bundle lookup because 3.0.x ignored the target mapping during verification.
- The troubleshooting text treated “No signatures found” as a possible authorization error. Current Cosign normally propagates registry authorization errors separately, so the text now identifies discovery, mapping, client-version, and storage-format failures instead.
- The `401` description did not account for the normal Bearer-authentication challenge. It now distinguishes that initial challenge from a final credential failure and distinguishes `403`/`DENIED` authorization failures.
- The repository-scope description implied that a subject and same-repository referrers could require distinct scopes. Corrected it to one repository pull scope and documented the extra access, credentials, and TLS trust needed for an alternate repository.
- The private-CA guidance omitted that `--registry-cacert` replaces Cosign's system-root pool for the registry transport. Added the requirement to include trust anchors for all registry and separate token-service endpoints reached through that transport.
- The insecure-registry explanation covered only skipped certificate verification. Clarified that the flag also enables insecure registry handling, which can use HTTP, and identified credential theft and signature-discovery suppression as consequences while preserving the limits supplied by digest and signature checks.
- The `--registry-server-name` explanation did not note that the override applies to the shared registry transport. Added the resulting compatibility constraint for separate HTTPS token services and mapped signature-registry hosts.
- The post presented `--ca-roots`, `--ca-intermediates`, and `--certificate-chain` as current alternatives. Clarified that Cosign 3.1 deprecates them in favor of `--trusted-root` and that standardized-bundle verification rejects them.
- The `--k8s-keychain` description implied Kubernetes or Pod credential semantics. Corrected it to describe the built-in cloud and registry credential providers and explicitly state that it does not read Pod `imagePullSecrets`.
- The Kyverno statement lacked a version boundary and the concrete RBAC requirement. Added Kyverno 1.18 as the start of automatic Pod `spec.imagePullSecrets` use and identified the admission and background controllers that need Secret-read permission.
- The diagnostic sequence treated a subject pull as required for digest-pinned Cosign verification and listed keyless identity, trusted-time, and transparency checks as unconditional. Made the subject-pull check conditional on the workload, distinguished public-key from keyless verification, and made the evidence checks conditional on policy.

## Review Notes

All shell examples and Cosign flags were checked against the current Cosign 3.1.3 binary and tagged source. The six links in the post's Official Documentation section returned successful responses and point to the intended references. `--registry-client-cert` and `--registry-client-key` take effect only when supplied together. Registry-specific authentication, retention, proxying, and TLS topology still require testing from the actual CI or admission-controller runtime.
