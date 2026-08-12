# Validation Summary: Cosign vs Notation: Which Container Image Signing Workflow Fits Your Registry and Policy Engine?

## Status
validated

## Post Type
Technical Comparison / Decision Guide

## Technologies Covered
- Sigstore Cosign
- Sigstore keyless signing, Fulcio, Rekor, and Sigstore bundles
- Notation CLI and the Notary Project specifications
- X.509 trust stores, trust policies, and signing/verification plugins
- OCI images, image indexes, signature artifacts, and referrers
- KMS, HSM, PKCS #11, and local signing keys
- in-toto attestations
- Kyverno ImageValidatingPolicy
- Ratify
- Kubernetes admission control

## Sources Consulted
- [Cosign v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3) - current stable release and compatibility/deprecation context.
- [Cosign `sign` CLI reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md) and [Cosign `verify` CLI reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md) - command syntax, keyless verification flags, KMS keys, hardware keys, digest references, and registry-referrers modes.
- [Sigstore keyless-signing overview](https://docs.sigstore.dev/cosign/signing/overview/) and [Sigstore security model](https://docs.sigstore.dev/about/security/) - ephemeral keys, OIDC identity, Fulcio certificates, Rekor evidence, and trusted roots.
- [Cosign key-management overview](https://docs.sigstore.dev/cosign/key_management/overview/) and [hardware-token documentation](https://docs.sigstore.dev/cosign/key_management/hardware-based-tokens/) - supported KMS URI workflows and the special build requirements for PIV/PKCS #11 support.
- [Sigstore bundle format](https://docs.sigstore.dev/about/bundle/) - bundle contents, protobuf-defined schema, transparency evidence, timestamps, and offline-verification material.
- [Sigstore registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/) - OCI 1.1 referrer storage and alternate signature repositories.
- [Notation v1.3.2 release](https://github.com/notaryproject/notation/releases/tag/v1.3.2) - current stable Notation version reviewed.
- [Notation `sign` CLI specification](https://github.com/notaryproject/notation/blob/v1.3.2/specs/commandline/sign.md) and [Notation `verify` CLI specification](https://github.com/notaryproject/notation/blob/v1.3.2/specs/commandline/verify.md) - commands, prerequisites, JWS/COSE selection, digest resolution, referrers behavior, and trust configuration.
- [Notary Project trust store and trust policy specification](https://github.com/notaryproject/specifications/blob/main/specs/trust-store-trust-policy.md) - policy schema, repository scopes, verification levels, trust stores, mandatory identity RDNs, timestamps, and revocation behavior.
- [Notary Project signature specification](https://github.com/notaryproject/specifications/blob/main/specs/signature-specification.md) and [signing and verification workflow](https://github.com/notaryproject/specifications/blob/main/specs/signing-and-verification-workflow.md) - signature artifacts, X.509 chains, signed attributes, JWS/COSE envelopes, and verification steps.
- [Notary Project plugin extensibility specification](https://github.com/notaryproject/specifications/blob/main/specs/plugin-extensibility.md) - remote signing-key integration and extended verification capabilities.
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md#listing-referrers), [OCI image manifest](https://github.com/opencontainers/image-spec/blob/main/manifest.md), and [OCI image index](https://github.com/opencontainers/image-spec/blob/main/image-index.md) - subjects, repository-scoped referrer discovery, fallback behavior, and multi-platform descriptors.
- [Kyverno ImageValidatingPolicy documentation](https://kyverno.io/docs/policy-types/image-validating-policy/) - current Cosign and Notary attestors, registry credentials, digest mutation/verification, and attestation support.
- [Ratify Notation verifier](https://ratify.dev/docs/plugins/verifier/notation/) and [Ratify Cosign verifier](https://ratify.dev/docs/plugins/verifier/cosign/) - supported verifier ecosystems.

## Issues Found
1. **The Notation trusted-identity example was invalid.** Its `x509.subject` omitted the state/province RDN, although the Notary Project specification requires every such identity to include `C`, `ST` or `S`, and `O`. Changed it to `x509.subject: C=GB, ST=England, O=Example Corp, CN=Release Signing` while retaining the instruction to match the approved certificate exactly.
2. **The Notation offline-evidence comparison omitted important prerequisites.** Expanded it to include the signature artifact and its X.509 chain, trust store/policy, any required verification plugins, and planning for the selected revocation and timestamp dependencies.
3. **The Kyverno reference targeted a deprecated policy API.** Replaced the legacy `ClusterPolicy.verifyImages` wording and link with the current stable `policies.kyverno.io/v1` `ImageValidatingPolicy`, whose documentation describes both Cosign and Notary attestors.
4. **The separate-signature-repository checklist item implied universal support.** Notation v1.3.2 does not expose an alternate signature-repository destination, and standard OCI referrer discovery is repository-scoped. Qualified the checklist item so it applies only where both the selected signer and verifier support that layout.

## Review Notes
- The Cosign commands and flags are valid for v3.1.3. The keyless example requires a usable interactive or ambient OIDC flow, registry access, and independently trusted Sigstore roots; the KMS URI must use a supported provider-specific scheme.
- The Notation commands, trust-policy fields, JWS default, and `--signature-format cose` behavior are valid for stable v1.3.2 when a default signing key, trust store, and trust policy have been configured as stated.
- Notation v1.3.2 defaults to the referrers tag schema and can try the OCI Referrers API with fallback when `--force-referrers-tag=false`; the v2.0.0-alpha.1 prerelease changed the default to the Referrers API. The post correctly keeps this behavior version-qualified.
- Cosign v3 uses OCI 1.1 referrers by default and retains a legacy registry mode. Its standardized bundle is defined with protobuf schemas and normally serialized as JSON.
- Cosign hardware-token support is optional and requires a PIV/PKCS #11-enabled build rather than the standard release build.
- Ratify supports both Notation and Cosign verifiers; its placement under the Notary Project should not be interpreted as Notation-only support.
- All seven links in the post's Official Documentation section were checked and resolve to the intended current resources after the Kyverno link update.
