# Validation Summary: Cosign Signature vs Attestation vs SBOM: What Does Each One Prove?

## Status
validated

## Post Type
Technical reference and supply-chain security guide

## Technologies Covered
- Cosign v3.1.3
- Sigstore keyless signing and verification
- in-toto attestations and DSSE envelopes
- SLSA Provenance v1
- Software bills of materials (SBOMs)
- SPDX and CycloneDX
- OCI artifacts, subject associations, and referrers
- Certificate, trusted-time, and transparency-log verification

## Sources Consulted
- Cosign v3.1.3 release and generated command references - https://github.com/sigstore/cosign/releases/tag/v3.1.3
- Cosign `sign` reference - https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md
- Cosign `verify` reference - https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md
- Cosign `attest` reference - https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_attest.md
- Cosign `verify-attestation` reference - https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-attestation.md
- Sigstore signature verification - https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore in-toto attestation verification - https://docs.sigstore.dev/cosign/verifying/attestation/
- Sigstore timestamp verification - https://docs.sigstore.dev/cosign/verifying/timestamps/
- Sigstore guidance for signing SBOMs and other OCI artifacts - https://docs.sigstore.dev/cosign/signing/other_types/
- Sigstore threat model and policy considerations - https://docs.sigstore.dev/about/threat-model/
- Sigstore client verification specification - https://github.com/sigstore/architecture-docs/blob/main/client-spec.md
- in-toto Statement v1 specification - https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md
- in-toto Reference predicate - https://github.com/in-toto/attestation/blob/main/spec/predicates/reference.md
- DSSE protocol specification - https://github.com/secure-systems-lab/dsse/blob/master/protocol.md
- SLSA v1.2 provenance and artifact-verification guidance - https://slsa.dev/spec/v1.2/build-provenance and https://slsa.dev/spec/v1.2/verifying-artifacts
- OCI Image Manifest and Content Descriptor specifications - https://github.com/opencontainers/image-spec/blob/main/manifest.md and https://github.com/opencontainers/image-spec/blob/main/descriptor.md
- OCI Distribution Specification referrers API - https://github.com/opencontainers/distribution-spec/blob/main/spec.md
- ORAS `attach` command reference - https://oras.land/docs/commands/oras_attach/
- SPDX specifications - https://spdx.dev/use/specifications/
- CycloneDX specification overview - https://cyclonedx.org/specification/overview/

## Issues Found
- The heading, comparison table, and conclusion treated a cryptographic signature as authorization. A valid signature proves that the matching key or identity signed the digest; verifier policy decides whether that signer was authorized. Changed those passages to distinguish signer authentication and digest binding from authorization policy.
- The `cosign verify-attestation` example redirected output to a `.json` file even though the command can print multiple matching DSSE envelopes. Renamed the output to `verified-attestations.dsse.jsonl` and documented that each JSON Lines record is an envelope whose base64-encoded payload contains the in-toto statement.
- The predicate-policy examples included “completeness,” which could be mistaken for the field removed from SLSA Provenance v1. Replaced it with “resolved dependencies,” which corresponds to the current `resolvedDependencies` field.
- The SBOM section said integrity and subject binding require a signature or signed attestation. A digest obtained through a trusted channel is sufficient to check content integrity, while signed evidence authenticates who vouched for an inventory and its image association. Updated the explanation to separate those properties.
- The external-SBOM example used a custom predicate even though in-toto now provides a vetted Reference predicate specifically for out-of-band documents such as SBOMs. Replaced the JSON with the Reference predicate schema, supplied its standard predicate URI, and retained custom predicates only as a fallback when the vetted schema does not fit.
- The evidence table said a signed OCI SBOM artifact binds directly to “the SBOM digest.” Cosign signs the OCI artifact manifest digest, and that manifest transitively binds the SBOM blob descriptor. Updated the row to reflect the actual OCI digest chain and the separately checked image association.

## Review Notes
All command names and flags were checked against the checksum-verified Cosign v3.1.3 release binary and its official generated documentation. The `slsaprovenance1` alias remains current and maps to SLSA Provenance v1. All external links in the post resolved successfully on 2026-08-12. Cosign v3 also represents ordinary `cosign sign` output internally as a DSSE-wrapped in-toto statement and stores it as an OCI 1.1 referrer; the post's signature-versus-attestation distinction is therefore semantic and policy-oriented, not a claim that only attestations can use in-toto or DSSE. The deprecated Cosign-specific SBOM attachment layout was not recommended by the post.
