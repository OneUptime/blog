# Validation Summary: How to Update Fulcio Certificate Parsers for DER-Encoded Issuer Extensions

## Status
validated

## Post Type
Technical migration and troubleshooting guide.

## Technologies Covered
- Fulcio and Sigstore certificate extensions
- Go: encoding/asn1, crypto/x509/pkix, and unicode/utf8
- X.509, ASN.1 DER, and UTF8String
- OpenSSL certificate inspection
- OIDC issuer identity and artifact signature verification

## Sources Consulted
- [Fulcio OID directory](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md): issuer OIDs, legacy raw bytes, and universal UTF8String encoding.
- [Fulcio extension implementation](https://github.com/sigstore/fulcio/blob/main/pkg/certificate/extensions.go): legacy and modern issuer production and coexistence.
- [Go encoding/asn1 documentation](https://pkg.go.dev/encoding/asn1): RawValue, Unmarshal, trailing data, and MarshalWithParams with utf8.
- [Go ASN.1 parser implementation](https://go.dev/src/encoding/asn1/asn1.go): tag and length validation, including nonminimal and indefinite-length rejection.
- [Go pkix.Extension documentation](https://pkg.go.dev/crypto/x509/pkix#Extension): extension structure and byte value.
- [Go unicode/utf8.Valid documentation](https://pkg.go.dev/unicode/utf8#Valid): UTF-8 validation.
- [RFC 5280, sections 4.1 and 4.2](https://datatracker.ietf.org/doc/html/rfc5280): extension OCTET STRING wrapper and prohibition on duplicate extensions.
- [OpenSSL x509 documentation](https://docs.openssl.org/3.6/man1/openssl-x509/): -in, -text, and -noout options and equivalent inspection example.
- [Sigstore signature verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/): certificate identity and issuer constraints within signature verification.

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. The referenced technical links resolve to the intended official resources.
- The modern helper correctly requires a single primitive universal UTF8String, rejects trailing data and empty or invalid UTF-8 content, and preserves the decoded string exactly. Its APIs are current and not deprecated.
- The legacy issuer OID is deprecated upstream, but retaining an explicit historical compatibility path is appropriate. Fulcio's producer emits both issuer forms; the post correctly presents equality checks and rejection of malformed modern values as verifier policy. Duplicate extensions are also prohibited by RFC 5280.
- The recommended long-string fixture exercises length encoding beyond the 127-byte short-form boundary. The suggested negative cases cover relevant parsing and integration failures.
- The helper only decodes one extension. Missing fields, duplicate OIDs, coexistence, configured issuer matching, and authenticated artifact acceptance must be handled by the surrounding verifier, as the post explains.
- The OpenSSL command was checked against official documentation; no real certificate fixture was supplied for an end-to-end inspection.
- Runtime validation passed using Go 1.25.3 (darwin/arm64). The exact README helper was extracted into a temporary package: three round trips covered a short URL, a URL with a 256-character suffix, and Unicode. Eleven negative inputs covered missing data, empty content, truncation, PrintableString, invalid UTF-8, trailing bytes, constructed encoding, a non-universal class, nonminimal length, indefinite length, and a nonminimal tag. All were rejected. Temporary tests did not implement or exercise the surrounding certificate policy.
