# Validation Summary: Verify Private Fulcio Certificates with Rekor and CT Trust Material

## Status

validated

## Post Type

Technical guide and troubleshooting reference

## Technologies Covered

- Sigstore
- Cosign v3
- Fulcio
- Rekor v1 and Rekor v2
- Certificate Transparency and Signed Certificate Timestamps
- Sigstore `TrustedRoot` and `SigningConfig`
- RFC 3161 timestamp authorities
- The Update Framework (TUF)
- X.509 certificate-path validation
- OpenSSL

## Sources Consulted

- [Cosign v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign custom infrastructure configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Cosign `verify` command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign `verify-blob` command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-blob.md)
- [Cosign `trusted-root create` command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_trusted-root_create.md)
- [Cosign v3.1.3 verification-policy implementation](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/cosign/verify.go)
- [Cosign v3.1.3 bundle-verification implementation](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/cosign/verify_bundle.go)
- [Cosign trusted-root creation implementation](https://github.com/sigstore/cosign/blob/main/cmd/cosign/cli/trustedroot/trustedroot.go)
- [Cosign bundle storage specification](https://github.com/sigstore/cosign/blob/main/specs/BUNDLE_SPEC.md)
- [Sigstore timestamp documentation](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Sigstore client specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)
- [Rekor v2 specification](https://github.com/sigstore/architecture-docs/blob/main/rekor-v2-spec.md)
- [Rekor v2 client guidance](https://github.com/sigstore/rekor-tiles/blob/main/CLIENTS.md)
- [Sigstore trusted-root protobuf](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto)
- [Sigstore Rekor protobuf](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_rekor.proto)
- [Sigstore bundle protobuf](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto)
- [Fulcio repository overview and certificate lifetime](https://github.com/sigstore/fulcio)
- [Fulcio CT log and SCT design](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Fulcio security model](https://github.com/sigstore/fulcio/blob/main/docs/security-model.md)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280.html)
- [RFC 6962: Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962.html)
- [RFC 3161: Time-Stamp Protocol](https://www.rfc-editor.org/rfc/rfc3161.html)
- [OpenSSL `verify` documentation](https://docs.openssl.org/master/man1/openssl-verify/)
- [OpenSSL `x509` documentation](https://docs.openssl.org/master/man1/openssl-x509/)

## Issues Found

- The post treated artifact transparency and trusted time as interchangeable. It now explains that current Cosign requires artifact-transparency evidence by default and separately establishes time from a verified Rekor v1 SET or RFC 3161 timestamp. It also states that a `SigningConfig` selects signing services but does not change verification thresholds.
- Rekor v1 `integratedTime`, SETs, SCTs, and inclusion proofs were described too generically. The review distinguished signed inclusion promises from Merkle inclusion proofs, stated that `integratedTime` is authenticated only by a verified SET, and clarified that an SCT is a CT log's promise to include a certificate or precertificate.
- The artifact-signature row said Cosign signs the digest directly. It now accurately says the signature covers a payload that binds the artifact digest.
- The trusted-root command supplied `origin` for otherwise conventional RFC 6962 CT and Rekor v1 entries. Current Cosign interprets those fields as checkpoint/static-CT or Rekor v2 identifiers, which can prevent matching the evidence's normal SHA-256/SPKI log ID. The fields were removed, and their version-specific use was documented.
- TSA and Fulcio chain ordering needed to be distinguished. The post now specifies TSA-leaf-first ordering for `--tsa` and issuing-intermediate-first/trust-anchor-last ordering for Fulcio material.
- The container-image example used `cosign verify --bundle`, but current Cosign's image command has no `--bundle` flag. The invalid flag was removed, and the text now explains that image verification retrieves the OCI-attached bundle; standalone local bundles use `verify-blob`, while saved image layouts use `--local-image`.
- Rekor v2 and RFC 3161 evidence were presented as mutually exclusive choices. The wording now reflects that Rekor v2 requires separate RFC 3161 time evidence for short-lived Fulcio certificates.
- The CT-shard statement assumed every shard uses a different key. It was qualified because CT shards can reuse a signing key and therefore share a Log ID.
- The bypass example did not explicitly supply private Fulcio trust and implied it could validate any otherwise valid leaf. It now supplies `--trusted-root` and explains that, without accepted signed-timestamp verification, current Cosign uses the current time and rejects an expired leaf.
- The conclusion used artifact transparency and an approved timestamp as alternatives. It now lists artifact transparency and trusted time as separate checks in Cosign's default keyless-verification policy.

## Review Notes

- The CLI review was performed against Cosign v3.1.3, the latest official release on the validation date. Verification behavior is version-specific, so deployments should continue to pin and test their selected release.
- The four `--no-default-*` flags are valid in v3.1.3 but redundant unless `--with-default-services` is also supplied.
- Exact diagnostic wording can vary between Cosign's legacy and standardized-bundle verification paths; the listed errors still identify the correct trust layers.
- All nine links in the post's Official Documentation section resolved successfully to the intended official Sigstore source or documentation page.
