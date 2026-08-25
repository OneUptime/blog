# How to Inspect Fulcio SANs and Sigstore OID Extensions with OpenSSL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OpenSSL, X.509, OIDC, Cosign, Certificate Inspection

Description: Extract a Fulcio leaf from a standardized Sigstore bundle and inspect its SAN, issuer, key usage, validity, SCT, and versioned Sigstore OID extensions safely with OpenSSL.

---

OpenSSL is excellent for answering “what is in this Fulcio certificate?” It can display the SAN, issuer extension, CI metadata OIDs, key usage, validity interval, public-key algorithm, and embedded Signed Certificate Timestamp (SCT).

It is not a complete Sigstore verifier. OpenSSL alone does not verify the artifact signature, Rekor evidence, trusted Sigstore metadata, or the policy meaning of an OIDC identity. Use it for inspection and diagnosis, then use Cosign or another Sigstore verifier for the security decision.

## Extract the Leaf from a Bundle

Cosign v3 uses the standardized Sigstore bundle by default. A public-infrastructure bundle normally carries a single leaf in `verificationMaterial.certificate`; other valid bundles can use an X.509 chain. This `jq` expression handles both:

```bash
BUNDLE='artifact.sigstore.json'

jq -er '
  .verificationMaterial.certificate.rawBytes //
  .verificationMaterial.x509CertificateChain.certificates[0].rawBytes
' "$BUNDLE" |
  tr -d '\n' |
  openssl base64 -d -A > fulcio-leaf.der
```

`rawBytes` is Base64-encoded DER, not PEM. Check that parsing succeeds before trusting subsequent output:

```bash
openssl x509 \
  -inform DER \
  -in fulcio-leaf.der \
  -out fulcio-leaf.pem
```

If neither JSON path exists, inspect the bundle's `mediaType` and schema. Do not guess a field from a legacy Cosign bundle and silently fall back to a public key; upgrade old bundles with current Cosign tooling and use a patched verifier.

## Read the Certificate Summary

Start with concise, stable fields:

```bash
openssl x509 -in fulcio-leaf.pem -noout \
  -subject \
  -issuer \
  -serial \
  -dates \
  -fingerprint -sha256
```

A conforming Fulcio leaf has an empty Subject. Identity belongs in the Subject Alternative Name, so an empty `subject=` is expected rather than an issuance bug.

The public Fulcio service currently issues ten-minute certificates. Confirm the exact `notBefore` and `notAfter` values instead of inferring issuance time from a filename. A private fork could differ, and a ten-minute leaf can be verified long afterward only with accepted signed-time evidence that places signing within the certificate's validity interval.

Inspect the SAN and usage extensions:

```bash
openssl x509 -in fulcio-leaf.pem -noout \
  -ext subjectAltName,keyUsage,extendedKeyUsage
```

Expected properties include:

- a critical SAN containing an email, URI, or supported `otherName` identity;
- critical Key Usage permitting digital signature; and
- Extended Key Usage for code signing.

The certificate profile also requires a Subject Key Identifier and an Authority Key Identifier that links to the issuing certificate.

## Display All Sigstore Extensions

Use the full text output because OpenSSL does not have friendly names for every Sigstore private OID:

```bash
openssl x509 -in fulcio-leaf.pem -noout -text -certopt ext_parse |
  less
```

Search inside `less` for `1.3.6.1.4.1.57264`. Important modern Fulcio extensions are:

| OID | Meaning |
| --- | --- |
| `1.3.6.1.4.1.57264.1.8` | OIDC Issuer V2 |
| `1.3.6.1.4.1.57264.1.9` | Build Signer URI |
| `1.3.6.1.4.1.57264.1.10` | Build Signer Digest |
| `1.3.6.1.4.1.57264.1.11` | Runner Environment |
| `1.3.6.1.4.1.57264.1.12` | Source Repository URI |
| `1.3.6.1.4.1.57264.1.13` | Source Repository Digest |
| `1.3.6.1.4.1.57264.1.14` | Source Repository Ref |
| `1.3.6.1.4.1.57264.1.15` | Source Repository Identifier |
| `1.3.6.1.4.1.57264.1.16` | Source Repository Owner URI |
| `1.3.6.1.4.1.57264.1.17` | Source Repository Owner Identifier |
| `1.3.6.1.4.1.57264.1.18` | Build Config URI |
| `1.3.6.1.4.1.57264.1.19` | Build Config Digest |
| `1.3.6.1.4.1.57264.1.20` | Build Trigger |
| `1.3.6.1.4.1.57264.1.21` | Run Invocation URI |
| `1.3.6.1.4.1.57264.1.22` | Source Repository Visibility at Signing |
| `1.3.6.1.4.1.57264.1.23` | Deployment Environment |
| `1.3.6.1.4.1.57264.1.24` | Raw OIDC Token Subject |

Extensions `.1.8` through `.1.24` are DER-encoded UTF8String values. The `ext_parse` option asks OpenSSL to ASN.1-parse unsupported extensions, so these values should appear on a `UTF8STRING` line. Without it, OpenSSL commonly renders the DER tag and length as dots or escapes before the printable payload. Do not scrape either text format in a production policy; use an ASN.1-aware X.509 library and require a UTF8String.

The older issuer and GitHub-specific OIDs `.1.1` through `.1.6` contain raw, non-DER strings and are deprecated, so `ext_parse` typically reports `Error in encoding` for them. Fulcio still emits `.1.1`, and its GitHub Actions configuration also populates `.1.2` through `.1.6`, for backward compatibility. OID `.1.7` identifies Fulcio's username `otherName` SAN rather than a normal extension value.

## Identify the SAN Type

Typical output differs by principal:

```text
X509v3 Subject Alternative Name: critical
    email:developer@example.com
```

```text
X509v3 Subject Alternative Name: critical
    URI:https://github.com/acme/widget/.github/workflows/release.yml@refs/tags/v1.2.3
```

```text
X509v3 Subject Alternative Name: critical
    URI:spiffe://build.example.com/release/signer
```

Do not read the SAN without the issuer. A verifier must bind the SAN to the authenticated OIDC issuer—normally Issuer V2 (`.1.8`), with the deprecated issuer extension (`.1.1`) supported for legacy compatibility—because two OIDC providers can assert the same textual subject.

For GitHub Actions, the URI SAN comes from `job_workflow_ref`; it is also the Build Signer URI. The raw GitHub `sub`, branch or environment context, initiating workflow, and source repository are separate extensions. A SAN alone cannot describe all provenance decisions.

## Inspect the Embedded SCT

Fulcio prefers an embedded SCT from its certificate-transparency log. In OpenSSL text output, look for:

```text
CT Precertificate SCTs
```

The underlying RFC 6962 embedded-SCT extension OID is `1.3.6.1.4.1.11129.2.4.2`. The SCT is a signed promise from a particular log to include the certificate. Seeing bytes in this extension is not enough: a Sigstore verifier validates the SCT with a trusted CT log key distributed through trusted root metadata. The SCT does not prove that the artifact signature was made during the certificate lifetime; a verified Rekor v1 inclusion promise (the signed entry timestamp) or accepted RFC 3161 timestamp evidence supplies signed time for that purpose.

Every Fulcio signing backend supports returning a detached SCT, while embedded-SCT support is backend-dependent. A detached SCT is returned alongside the certificate chain in the Fulcio API response; the standardized Sigstore bundle has no field for it, and Cosign does not store it. Preserve and inspect the original API response as well as the leaf when diagnosing a private deployment.

## Diagnose the Chain at the Correct Time

If you have an authenticated root and intermediate, OpenSSL can diagnose path construction:

```bash
INTEGRATED_TIME='1787652300'

openssl verify \
  -trusted fulcio-roots.pem \
  -untrusted fulcio-intermediates.pem \
  -attime "$INTEGRATED_TIME" \
  fulcio-leaf.pem
```

The `-trusted` option limits trust anchors to the supplied roots instead of also consulting default platform stores. Use a Rekor `integratedTime` only after validating the v1 inclusion promise that signs it; an inclusion proof alone does not authenticate that field. Alternatively, use the time from validated RFC 3161 evidence. Do not copy a time from an untrusted JSON field. Obtain public Sigstore trust material through its TUF root rather than downloading a root certificate from the same endpoint under investigation.

This command only diagnoses X.509 path and time validity. It still does not establish:

- that the artifact matches the bundle digest;
- that the artifact signature verifies with the leaf key;
- that Rekor or timestamp evidence is authentic;
- that the SCT is valid for a trusted CT log;
- that the identity and issuer satisfy your policy; or
- that required CI OID values match an approved workflow.

Run the corresponding Cosign verification after inspection:

```bash
cosign verify-blob artifact.tar.gz \
  --bundle artifact.sigstore.json \
  --certificate-identity \
    'https://github.com/acme/widget/.github/workflows/release.yml@refs/tags/v1.2.3' \
  --certificate-oidc-issuer \
    'https://token.actions.githubusercontent.com'
```

## Make Inspection Reproducible

For incident response, record:

- SHA-256 fingerprint and serial number of the leaf;
- exact SAN type and value;
- Issuer V2 value;
- validity interval;
- Build Signer, Build Config, source repository, and immutable digest extensions;
- SCT log ID and timestamp as decoded by a validating Sigstore tool; and
- Rekor log index, and integrated time only when authenticated by a verified inclusion promise.

Keep the original bundle unchanged. Derived PEM and text output are convenient evidence, but they are not substitutes for the signed bytes.

## Official Documentation

- [Sigstore bundle format and certificate field](https://docs.sigstore.dev/about/bundle/)
- [Fulcio OID directory and encoding rules](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Fulcio certificate specification](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md)
- [Fulcio certificate-transparency design](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Fulcio OIDC SAN mappings](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Cosign verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/)

## Conclusion

Extract the DER leaf from the Sigstore bundle, inspect its empty Subject, critical SAN, code-signing usage, issuer, modern Fulcio OIDs, and SCT, and preserve the original bytes. Then make the actual trust decision with a Sigstore verifier that validates the artifact, chain, identity, signed time, and transparency evidence together.
