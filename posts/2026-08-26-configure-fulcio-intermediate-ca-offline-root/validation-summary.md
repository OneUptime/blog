# Validation Summary: How to Configure Fulcio as an Intermediate CA Beneath an Offline Root

## Status

validated

## Post Type

Technical tutorial and private-PKI deployment guide

## Technologies Covered

- Sigstore Fulcio
- X.509 PKI and RFC 5280 certificate profiles
- Offline root and online intermediate certificate authorities
- OpenSSL 3.x
- Cloud KMS backends for AWS, Google Cloud, Azure, and HashiCorp Vault
- OIDC-issued code-signing certificates
- Certificate Transparency, Rekor, and timestamp authorities
- Sigstore `TrustedRoot`, `SigningConfig`, and TUF trust distribution

## Sources Consulted

- [Normative Fulcio certificate profile](https://github.com/sigstore/architecture-docs/blob/30974174a4aa05a2c73509a1d4391bd44c7eb764/fulcio-spec.md#7-certificate-profile)
- [RFC 5280, Section 4.1.2.2: certificate serial numbers](https://www.rfc-editor.org/rfc/rfc5280.html#section-4.1.2.2)
- [RFC 5280, Appendix B: ASN.1 INTEGER sign-octet encoding](https://www.rfc-editor.org/rfc/rfc5280.html#appendix-B)
- [OpenSSL 3.6 `x509` documentation](https://docs.openssl.org/3.6/man1/openssl-x509/)
- [OpenSSL 3.6 certificate verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/)
- [OpenSSL 3.6 X.509 extension configuration](https://docs.openssl.org/3.6/man5/x509v3_config/)
- [Fulcio signing backend and CA-chain setup](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/docs/setup.md)
- [Fulcio server flag definitions](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/cmd/app/serve.go#L93-L115)
- [Sigstore Google Cloud KMS resource parser used by Fulcio](https://github.com/sigstore/sigstore/blob/v1.10.8/pkg/signature/kms/gcp/client.go#L132-L159)
- [Fulcio startup chain and signer validation](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/common.go#L42-L92)
- [Fulcio BaseCA leaf issuance](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/baseca/baseca.go#L126-L144)
- [Fulcio v2 trust-bundle API schema](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/fulcio.proto#L191-L207)
- [Fulcio Certificate Maker documentation](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/docs/certificate-maker.md)
- [Sigstore trusted-root and signing-configuration protobuf](https://github.com/sigstore/protobuf-specs/blob/0342fe5797edd558c58098033220fb27a2542a28/protos/sigstore_trustroot.proto)
- [Sigstore client specification](https://github.com/sigstore/architecture-docs/blob/30974174a4aa05a2c73509a1d4391bd44c7eb764/client-spec.md)
- [Cosign custom infrastructure configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Sigstore threat model and TUF revocation guidance](https://github.com/sigstore/docs/blob/main/content/en/about/threat-model.md)
- [Go 1.26 `crypto/x509` certificate generation](https://github.com/golang/go/blob/release-branch.go1.26/src/crypto/x509/x509.go)

## Issues Found

- The serial command forced the high bit of a 160-bit positive value. ASN.1 DER then adds a leading `00` sign octet, producing a 21-octet serial and violating RFC 5280's 20-octet maximum. The command now rejection-samples a nonzero 20-byte value whose high bit is clear, and the text explains the conflict between Fulcio's literal “160-bit” wording and RFC 5280 encoding.
- The intermediate profile wording treated a noncritical Code Signing EKU as a normative MUST and ambiguously suggested that the intermediate SKI equals the root SKI. The post now reflects the profile's SHOULD-NOT-critical strength and states clearly that only the intermediate AKI equals the root SKI.
- The OpenSSL verification examples used permissive verification without `-x509_strict`, and the leaf used `-purpose any`, which performs no code-signing-purpose check. RFC-strict checking was added, and the leaf now uses OpenSSL 3.2+'s `codesign` purpose while retaining separate inspection for Fulcio-specific constraints that OpenSSL does not enforce.
- The post claimed every incomplete chain fails Fulcio startup. Current Fulcio trusts the final supplied certificate directly, so an intermediate-only, one-certificate chain can pass. The text now lists only the failures Fulcio actually detects and warns that operators must independently confirm the final certificate is the intended offline root.
- The normative profile requires a leaf SKI, but current `kmsca`, `tinkca`, and `fileca` issuance through Fulcio's shared `BaseCA` path does not set one, and Go only synthesizes an SKI automatically for CA templates. A version-pinned caveat now identifies this upstream implementation/profile gap.
- The trust-distribution section mentioned only the offline root and attributed active-service selection to `TrustedRoot`. It now requires distribution of the complete Fulcio chain, distinguishes verification-material windows in `TrustedRoot` from active endpoint windows in `SigningConfig`, and describes TUF's distribution and freshness role accurately.
- The compromise procedure relied on identity or digest policy and only removed workload access, which does not revoke an intermediate key capable of issuing certificates for arbitrary identities. It now requires disabling the compromised KMS key version, removing all signing authorization, and publishing an authenticated TUF/`TrustedRoot` cutoff or full distrust update. Identity and digest deny rules are correctly described as supplementary containment.

## Review Notes

- Fulcio source was reviewed at commit `ae51cd5b978de4389588cbb20cb08845e4e8b98c` and the architecture profile at `30974174a4aa05a2c73509a1d4391bd44c7eb764`, current for this validation date.
- All shown `fulcio-server` flags and the Google Cloud KMS resource form are current. The signer-first PEM order and `/api/v2/trustBundle` JSON path are correct for the single-chain deployment shown.
- The corrected OpenSSL certificate-generation and verification flow was executed with OpenSSL 3.6.2. The intermediate serial encoded in 20 octets, and RFC-strict root, intermediate, and code-signing leaf verification all succeeded.
- `certificate-maker` supports the named KMS providers, but its default CA templates leave organization empty; the post correctly requires a custom template and independent profile validation. Its existing-root workflow also still requires access to the matching root KMS signer, so it belongs inside the authorized root ceremony.
- Password-protected `fileca` remains testing-only under the Fulcio architecture profile.
