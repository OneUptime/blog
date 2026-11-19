# How to Update Fulcio Certificate Parsers for DER-Encoded Issuer Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Go, Security, Troubleshooting

Description: Migrate Fulcio issuer extension parsing from legacy raw strings to strict DER UTF8String decoding while retaining explicit compatibility checks.

A certificate parser that once compared an extension directly with an issuer URL can begin rejecting valid Fulcio certificates when it encounters the newer issuer extension. The URL did not necessarily change. Its encoding did.

Fulcio's [OID directory](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md) specifies a legacy issuer extension at `1.3.6.1.4.1.57264.1.1` containing raw string bytes and a newer issuer extension at `1.3.6.1.4.1.57264.1.8` containing a DER-encoded UTF8String. Select decoding rules by OID rather than guessing from whether the bytes look printable.

## Understand the two layers

An X.509 extension contains an outer OCTET STRING holding its value. Certificate libraries normally expose the contents of that outer wrapper. For the newer Fulcio issuer OID, those contents still include the inner DER UTF8String tag and length.

Consequently, converting the exposed bytes directly to text may produce control characters before the URL. Trimming whitespace is not a repair. Removing the first two bytes is also incorrect because DER uses different length encodings for different sizes.

The [upstream extension implementation](https://github.com/sigstore/fulcio/blob/main/pkg/certificate/extensions.go) is useful when comparing your decoder with the producer. Keep the legacy and modern paths separate, and do not apply DER parsing indiscriminately to every historical Sigstore extension.

## Decode the modern value strictly

The following Go helper accepts the value from `pkix.Extension.Value`. It checks the ASN.1 tag, rejects trailing bytes, and validates UTF-8. Go's [ASN.1 package](https://pkg.go.dev/encoding/asn1) provides the DER parser; the additional checks make the intended type explicit.

```go
package issuer

import (
    "encoding/asn1"
    "fmt"
    "unicode/utf8"
)

func DecodeIssuerV2(value []byte) (string, error) {
    var raw asn1.RawValue
    rest, err := asn1.Unmarshal(value, &raw)
    if err != nil {
        return "", fmt.Errorf("issuer DER: %w", err)
    }
    if len(rest) != 0 || raw.Class != asn1.ClassUniversal ||
        raw.Tag != asn1.TagUTF8String || raw.IsCompound {
        return "", fmt.Errorf("issuer must be one DER UTF8String")
    }
    if len(raw.Bytes) == 0 || !utf8.Valid(raw.Bytes) {
        return "", fmt.Errorf("issuer must contain nonempty UTF-8")
    }
    return string(raw.Bytes), nil
}
```

This helper parses one field. It does not verify a certificate chain, signature, transparency evidence, or the issuer's authorization to sign your artifact. Run it as part of the certificate processing performed by an established verification path, and compare the resulting value with your explicitly configured issuer.

For the legacy OID, retain an explicit raw UTF-8 decoder if you need historical compatibility. Reject invalid UTF-8 and empty values there too. Do not silently fall back to the legacy interpretation when the modern OID is present but malformed: that would hide bad input.

## Define coexistence rules

Inventory historical certificates before deploying the new parser. Some may contain only the legacy extension; others may carry both forms. Your migration policy should distinguish a missing modern field from a present field that fails decoding.

A conservative policy accepts either supported encoding when it is the only issuer field, requires equality when both are present, and rejects duplicate issuer OIDs or contradictory values. Record this as your verifier's policy rather than attributing it to a universal Fulcio compatibility requirement.

Compare issuer strings exactly after decoding. Lowercasing arbitrary paths, removing trailing slashes, or rewriting schemes can turn a mismatch into an apparent match. If a migration legitimately changes issuer identity, approve that change separately from the encoding update.

## Build fixtures around failure modes

Start with a modern extension produced by `asn1.MarshalWithParams("https://issuer.example", "utf8")`, then add a legacy raw value for the same URL. Include a long issuer string so the test exercises DER's longer length form rather than only the smallest encoding.

Negative fixtures should cover a truncated value, a different ASN.1 string type, invalid UTF-8, a valid value followed by extra bytes, and modern/legacy disagreement. Also test a certificate without either issuer field. These cases establish whether your code fails in a controlled way instead of accepting an accidental substring.

Inspect a real certificate with `openssl x509 -in certificate.pem -text -noout` while troubleshooting, but avoid parsing the human-readable OpenSSL display in production. Formatting changes and unfamiliar OIDs make it a fragile API.

Deploy the decoder first in observation mode against known accepted and rejected artifacts. Compare decisions, then enforce the new policy once unexpected differences are explained. Keep full signature verification in the same acceptance path so a correctly decoded issuer never becomes a substitute for authenticated signing evidence.
