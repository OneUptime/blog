# Validation Summary: How to Rotate a Cosign Signing Key Without Breaking Verification of Older Images

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Cosign v3.1.3
- Sigstore key management and signature verification
- AWS Key Management Service (AWS KMS)
- OCI registries, OCI 1.1 referrers, and legacy digest-tagged signature storage
- Rekor transparency-log evidence
- RFC 3161 trusted timestamps
- Shell-based CI verification and admission-policy concepts

## Sources Consulted

- [Cosign v3.1.3 `generate-key-pair` command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_generate-key-pair.md)
- [Cosign v3.1.3 `public-key` command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_public-key.md)
- [Cosign v3.1.3 `sign` command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md)
- [Cosign v3.1.3 `verify` command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Sigstore key-management overview](https://docs.sigstore.dev/cosign/key_management/overview/)
- [Sigstore signing with self-managed keys](https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/)
- [Sigstore container-signing documentation](https://docs.sigstore.dev/cosign/signing/signing_with_containers/)
- [Sigstore registry-support documentation](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Cosign registry details and legacy signature-storage behavior](https://github.com/sigstore/cosign/blob/main/README.md#registry-details)
- [Cosign bundle storage specification](https://github.com/sigstore/cosign/blob/main/specs/BUNDLE_SPEC.md#storage)
- [OCI Distribution Specification 1.1 referrers fallback behavior](https://github.com/opencontainers/distribution-spec/blob/main/spec.md#referrers-tag-schema)
- [Sigstore timestamp documentation](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [RFC 3161: Internet X.509 Public Key Infrastructure Time-Stamp Protocol](https://www.rfc-editor.org/rfc/rfc3161.html)
- [Sigstore threat model and revocation guidance](https://docs.sigstore.dev/about/threat-model/#secure-distribution-and-revocation-of-sigstore-key-material)
- [AWS KMS alias documentation](https://docs.aws.amazon.com/kms/latest/developerguide/kms-alias.html)
- [AWS KMS `GetPublicKey` API](https://docs.aws.amazon.com/kms/latest/APIReference/API_GetPublicKey.html)
- [AWS KMS `UpdateAlias` API](https://docs.aws.amazon.com/kms/latest/APIReference/API_UpdateAlias.html)

## Issues Found

- The AWS alias explanation treated every existing alias target as reusable. Clarified that Cosign reuses an existing readable, enabled asymmetric key rather than creating a new one, that a reused key must be checked for `SIGN_VERIFY` usage and a supported algorithm, and that other key types, states, or permissions can cause failure.
- The second `public-key` command was described as a retrieval check even though it rewrites the same output file. Clarified that it is an optional second retrieval and that a separate export or fingerprint comparison is required for an independent check.
- The cutover sequence could disable a KMS key before verifiers stopped retrieving its public key from KMS. Added the required migration to the retained public-key file first because AWS KMS `GetPublicKey` rejects disabled keys.
- The historical time rule did not distinguish a trusted timestamp from signer-controlled metadata or account for the trust placed in a transparency log's clock. Changed it to require a verified RFC 3161 timestamp or a trusted transparency-log integration-time cutoff.
- The retention wording called OCI 1.1 evidence “referrers,” which is imprecise and omitted the fallback discovery index. Changed it to retain the referring manifests and any fallback referrers index.
- Historical verification requirements mentioned signature artifacts but omitted availability of the signed subject. Added the signed subject to the required retained material.
- Dual-signing alone was said to prove both trust paths. Clarified that it makes both signatures available so each path can be tested; verification is the step that proves the paths work.

## Review Notes

All command names, flags, shell syntax, and AWS KMS URI examples were checked against Cosign v3.1.3, current on the validation date. A local Cosign v3.1.3 test confirmed custom-prefix key generation and byte-for-byte matching public-key re-export. The post's six official-documentation links all resolve to the intended resources.

Legacy Cosign signature lists and the OCI 1.1 fallback referrers index both require read/append/write updates and can lose concurrent changes; native registry Referrers API storage does not require that shared-list rewrite. Rekor v1 `integratedTime` is signed in the signed entry timestamp but comes from Rekor's internal clock and is not externally verifiable, so policies using it as a cutoff must explicitly trust the log's clock and evidence.
