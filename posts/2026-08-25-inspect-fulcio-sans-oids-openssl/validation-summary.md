# Validation Summary: How to Inspect Fulcio SANs and Sigstore OID Extensions with OpenSSL

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Fulcio
- Sigstore standardized bundles
- Cosign v3
- OpenSSL 3.x
- X.509 certificates and Subject Alternative Names
- OpenID Connect (OIDC)
- Rekor v1 and Rekor v2
- RFC 3161 timestamping
- Certificate Transparency and Signed Certificate Timestamps
- `jq`

## Sources Consulted

- [Sigstore bundle format](https://docs.sigstore.dev/about/bundle/)
- [Sigstore bundle protobuf specification](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto)
- [Sigstore common protobuf types](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_common.proto)
- [Sigstore Rekor protobuf types](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_rekor.proto)
- [Sigstore client specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)
- [Fulcio certificate specification](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md)
- [Fulcio OID directory and encoding rules](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Fulcio OIDC identity and SAN mappings](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Fulcio certificate-transparency design](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Fulcio identity-provider configuration](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml)
- [Fulcio extension rendering implementation](https://github.com/sigstore/fulcio/blob/main/pkg/certificate/extensions.go)
- [Fulcio certificate lifetime implementation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/common.go)
- [Fulcio v1.8.6 release notes](https://github.com/sigstore/fulcio/releases/tag/v1.8.6)
- [Cosign v3 installation and bundle-default documentation](https://docs.sigstore.dev/cosign/system_config/installation/)
- [Cosign `verify-blob` command reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-blob.md)
- [Cosign verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Sigstore timestamp verification documentation](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Cosign legacy-bundle security advisory GHSA-fx35-mq7g-6g98](https://github.com/sigstore/cosign/security/advisories/GHSA-fx35-mq7g-6g98)
- [Rekor v2 client guidance](https://github.com/sigstore/rekor-tiles/blob/main/CLIENTS.md)
- [OpenSSL 3.6 `x509` documentation](https://docs.openssl.org/3.6/man1/openssl-x509/)
- [OpenSSL 3.6 `verify` documentation](https://docs.openssl.org/3.6/man1/openssl-verify/)
- [OpenSSL 3.6 certificate verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/)
- [OpenSSL 3.6 Base64/encoding documentation](https://docs.openssl.org/3.6/man1/openssl-enc/)
- [RFC 5280: Internet X.509 Public Key Infrastructure Certificate Profile](https://www.rfc-editor.org/rfc/rfc5280.html)
- [RFC 6962: Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962.html)
- [RFC 3161: Time-Stamp Protocol](https://www.rfc-editor.org/rfc/rfc3161.html)

## Issues Found

- Clarified the deprecated raw-OID rendering statement. The post said `ext_parse` reports `Error in encoding` for every `.1.1` through `.1.6` value. These extensions are raw, non-DER strings and normally fail ASN.1 parsing, but arbitrary raw bytes could coincidentally form parseable ASN.1. Changed the statement to say OpenSSL “typically reports” the error.

## Review Notes

- The OpenSSL and `jq` examples were checked locally with OpenSSL 3.6.2 and `jq` 1.6. The Cosign example was checked against the official v3.1.3 command reference.
- Standardized bundle v0.3 public-good-instance keyless signatures use the single-certificate field. Bundle v0.1/v0.2 and some private-use bundles can use the certificate-chain field, whose first certificate is the leaf.
- Fulcio OID `.1.24` (Token Subject) was added in Fulcio v1.8.6. Older certificates can omit it, and CI metadata extensions remain provider- and claim-dependent.
- For legacy Cosign JSON bundles, the relevant verification bypass is fixed in Cosign v3.1.3 and v2.6.5. The standardized protobuf bundle format is not affected.
- Rekor v1 `integratedTime` is trustworthy for certificate-time validation only when authenticated by a verified signed entry timestamp. Rekor v2 sets that field to zero and relies on RFC 3161 timestamp evidence, as the post describes.
