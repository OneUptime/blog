# Validation Summary: How to Validate a Fulcio Root and Intermediate Chain Against Sigstore’s Certificate Profile

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Sigstore and Fulcio
- X.509 public key infrastructure and RFC 5280 certificate profiles
- OpenSSL certificate inspection and path validation
- ECDSA, RSA, Subject Public Key Info, SKI, and AKI
- Fulcio `fileca`, `kmsca`, `tinkca`, and `pkcs11ca` backends
- KMS, HSM, and PKCS #11 signer validation
- Bash pipelines

## Sources Consulted

- [Normative Sigstore Fulcio certificate profile, pinned revision](https://github.com/sigstore/architecture-docs/blob/30974174a4aa05a2c73509a1d4391bd44c7eb764/fulcio-spec.md#7-certificate-profile)
- [Sigstore public deployment certificate policy, pinned revision](https://github.com/sigstore/architecture-docs/blob/30974174a4aa05a2c73509a1d4391bd44c7eb764/sigstore-public-deployment-spec.md#21-code-signing-certificates)
- [Fulcio v1.8.8 release](https://github.com/sigstore/fulcio/releases/tag/v1.8.8), [runtime chain validation](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/common.go#L59-L105), and [chain-order definition](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/signercerts.go#L24-L58)
- Fulcio v1.8.8 backend implementations for [`fileca`](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/fileca/load.go#L30-L65), [`kmsca`](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/kmsca/kmsca.go#L39-L60), [`tinkca`](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/tinkca/tinkca.go#L51-L86), and [`pkcs11ca`](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/pkcs11ca/pkcs11ca.go#L43-L92)
- [Fulcio v1.8.8 CA certificate requirements](https://github.com/sigstore/fulcio/blob/v1.8.8/docs/setup.md#ca-certificate-requirements), [repository certificate specification](https://github.com/sigstore/fulcio/blob/v1.8.8/docs/certificate-specification.md), and [Certificate Maker documentation](https://github.com/sigstore/fulcio/blob/v1.8.8/docs/certificate-maker.md)
- [Sigstore v1.10.8 generic public-key acceptance checks used by Fulcio v1.8.8](https://github.com/sigstore/sigstore/blob/v1.10.8/pkg/cryptoutils/goodkey/publickey.go#L31-L79)
- [Sigstore's published trusted root](https://github.com/sigstore/root-signing/blob/ebc52304c5c7e47c89a310216e889cf305dc770f/targets/trusted_root.json)
- [RFC 5280: Internet X.509 Public Key Infrastructure Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280), especially Sections 4.1.2.2, 4.1.2.6, 4.2.1.1, 4.2.1.2, 4.2.1.9, and 7.1
- OpenSSL 3.6 documentation for [`crl2pkcs7`](https://docs.openssl.org/3.6/man1/openssl-crl2pkcs7/), [`pkcs7`](https://docs.openssl.org/3.6/man1/openssl-pkcs7/), [`x509`](https://docs.openssl.org/3.6/man1/openssl-x509/), [`verify`](https://docs.openssl.org/3.6/man1/openssl-verify/), [verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/), [`pkey`](https://docs.openssl.org/3.6/man1/openssl-pkey/), [`dgst`](https://docs.openssl.org/3.6/man1/openssl-dgst/), [name display options](https://docs.openssl.org/3.6/man1/openssl-namedisplay-options/), and [passphrase options](https://docs.openssl.org/3.6/man1/openssl-passphrase-options/)
- [Go `crypto/x509/pkix.Name` documentation](https://pkg.go.dev/crypto/x509/pkix#Name)
- [GNU Bash pipeline and `pipefail` documentation](https://www.gnu.org/software/bash/manual/bash.html#Pipelines)

## Issues Found

- The serial-number example incorrectly treated 40 hexadecimal display characters as proof of a 20-octet serial. OpenSSL's display omits DER sign padding and leading zeroes, and a literal positive 160-bit magnitude can conflict with RFC 5280's 20-octet encoded-`INTEGER` limit. The character-count command was removed and the text now requires DER parsing, documents the upstream profile/RFC tension, and retains separate randomness and uniqueness checks.
- The name-comparison guidance conflated Go's flattened `pkix.Name`, raw DER equality, and RFC 5280 name matching. It now requires complete RDN-sequence decoding and Section 7.1 comparison semantics, plus byte-identical CA Subject/Issuer encodings for a newly generated chain under Section 4.1.2.6.
- The root path-length guidance did not explain that `pathlen:0` on the root prevents the demonstrated root-intermediate-leaf path. The constraint now must permit at least one non-self-issued intermediate in this hierarchy.
- The extension checklist omitted RFC 5280's non-criticality requirement for SKI and AKI. The root and intermediate checks now state it explicitly.
- The OpenSSL path checks did not enable strict RFC 5280 validation. Both `openssl verify` commands now include `-x509_strict`; the post still correctly warns that an OpenSSL `OK` result is not a full Sigstore-profile audit.
- The SPKI comparison pipelines could hash empty input and appear equal if upstream commands failed because pipeline status normally reflects only the final command. The example now enables Bash `pipefail` and requires successful pipeline status before comparing hashes.
- The leaf checklist presented ten-minute validity as a general certificate-profile requirement. It now distinguishes the profile's parent-validity containment rule from the current Fulcio implementation and public-good deployment's ten-minute policy.
- The Fulcio runtime description was version-ambiguous and overstated its key checks. It is now pinned to Fulcio v1.8.8, describes the final certificate as a trust anchor, and identifies the check as Sigstore's generic acceptance check on the active signer rather than the stronger CA-profile recommendation across the chain.

## Review Notes

All other root and intermediate MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY statements match the pinned Sigstore architecture profile. The OpenSSL commands and flags were checked against OpenSSL 3.6 documentation and exercised with OpenSSL 3.6.2; the SPKI pipelines produced matching hashes for a generated key and certificate. Fulcio's relevant source paths were checked in v1.8.8 and current main, and the targeted `VerifyCertChain` test passed on the audited checkout. All external links in the post resolved to the intended official resources. The Sigstore profile's simultaneous “positive, 160 bit” wording and RFC 5280's 20-encoded-octet serial limit remain an upstream ambiguity, so a production ceremony must pin its interpretation and generator.
