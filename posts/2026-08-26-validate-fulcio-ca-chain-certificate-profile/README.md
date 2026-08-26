# How to Validate a Fulcio Root and Intermediate Chain Against Sigstore’s Certificate Profile

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, X.509, Certificate Profile, OpenSSL, Intermediate CA, PKI Validation

Description: Audit every normative root and intermediate field in Sigstore's current Fulcio profile, verify path and key matching, catch misleading OpenSSL success, and gate deployment.

---

A certificate can parse, be self-signed, and even build a path in OpenSSL while still violating Sigstore's Fulcio certificate profile. Fulcio roots and intermediates have exact name, criticality, usage, identifier, serial, lifetime, and algorithm rules intended for a code-signing CA.

Use the current architecture specification as the normative checklist. Fulcio's repository also contains an older certificate-specification document whose wording can lag newer requirements such as critical Key Usage and Basic Constraints. Pin both the specification revision and Fulcio release in the ceremony record.

## Split and Identify the Chain

Fulcio's file and KMS backends expect a PEM chain ordered from active signer to root. For a two-level hierarchy:

```text
certificate 0: Fulcio intermediate
certificate 1: self-signed root
```

List a combined file without trusting its labels:

```bash
openssl crl2pkcs7 \
  -nocrl \
  -certfile fulcio-ca-chain.pem |
  openssl pkcs7 -print_certs -noout
```

Keep individual `fulcio-intermediate.pem` and `fulcio-root.pem` inputs for the checks below. Record SHA-256 fingerprints first:

```bash
openssl x509 -in fulcio-root.pem -noout -fingerprint -sha256
openssl x509 -in fulcio-intermediate.pem -noout -fingerprint -sha256
```

Compare fingerprints with the approved ceremony manifest. A common name is not a key identifier.

## Validate the Root's Required Fields

Print the complete certificate once and retain the output:

```bash
openssl x509 -in fulcio-root.pem -noout \
  -subject -issuer -serial -dates -text
```

The root **must** satisfy all of these:

- Subject contains a nonempty organization and common name.
- Issuer is exactly the same name as Subject.
- Key Usage is critical and contains exactly Certificate Sign and CRL Sign.
- Basic Constraints is critical and contains `CA:TRUE`.
- Extended Key Usage is absent.
- Subject Key Identifier is present.
- serial is unique, random, positive, and 160 bits.
- the certificate is RFC 5280 compliant.

The root **may** include a path-length constraint. If it includes an Authority Key Identifier, that value must equal its SKI. Additional Subject attributes are allowed.

The profile recommends an ECDSA NIST P-384 or stronger CA key, or RSA-4096, and a lifetime that avoids frequent root rotation, such as ten years.

### Check exact names

Use a stable name format:

```bash
openssl x509 -in fulcio-root.pem -noout \
  -subject -issuer \
  -nameopt RFC2253
```

Do not compare only the displayed CN. Multi-valued RDNs, ordering, string encodings, and additional attributes can differ. A ceremony validator should compare the parsed X.509 `pkix.Name`/raw issuer and subject representation according to RFC 5280; the text output is a human review aid.

### Check exact extensions and criticality

In `openssl x509 -text`, expect output equivalent to:

```text
X509v3 Key Usage: critical
    Certificate Sign, CRL Sign
X509v3 Basic Constraints: critical
    CA:TRUE
X509v3 Subject Key Identifier:
    ...
```

Reject Digital Signature, Key Encipherment, or any other root Key Usage. Reject any root EKU, including Code Signing. Code Signing belongs on the Fulcio intermediate and issued leaves, not on the root.

### Check the serial

```bash
ROOT_SERIAL=$(openssl x509 -in fulcio-root.pem -noout -serial |
  sed 's/^serial=//')
printf '%s\n' "$ROOT_SERIAL"
printf '%s' "$ROOT_SERIAL" | wc -c
```

The canonical hexadecimal value should be positive and represent 20 octets (40 hex digits), with enough entropy from a cryptographic random generator. Text length alone cannot prove randomness or uniqueness. Check the CA issuance database/ceremony inventory for collision and preserve the generation evidence.

## Validate the Intermediate's Required Fields

```bash
openssl x509 -in fulcio-intermediate.pem -noout \
  -subject -issuer -serial -dates -text
```

The intermediate **must** satisfy:

- Subject contains a nonempty organization and common name.
- Issuer equals the parent root's Subject.
- Key Usage is critical and contains exactly Certificate Sign and CRL Sign.
- Extended Key Usage contains exactly Code Signing.
- its validity interval is contained within the parent's interval.
- Basic Constraints is critical and contains `CA:TRUE`.
- serial is unique, random, positive, and 160 bits.
- SKI is present.
- AKI equals the parent's SKI.
- the certificate is RFC 5280 compliant.

The intermediate should use `pathlen:0`, should use ECDSA P-384 or stronger or RSA-4096, should have a lifetime such as three years, and should not mark its Code Signing EKU critical. It should not switch between RSA and ECDSA relative to its parent because some clients cannot build mixed-scheme chains.

Expected extensions look like:

```text
X509v3 Basic Constraints: critical
    CA:TRUE, pathlen:0
X509v3 Key Usage: critical
    Certificate Sign, CRL Sign
X509v3 Extended Key Usage:
    Code Signing
X509v3 Subject Key Identifier:
    ...
X509v3 Authority Key Identifier:
    ...
```

Reject `serverAuth`, `clientAuth`, `emailProtection`, `anyExtendedKeyUsage`, or a second EKU. “Contains Code Signing” is insufficient when the profile says no other EKU.

## Compare SKI and AKI Directly

Extract the identifiers for visual/deterministic comparison:

```bash
openssl x509 -in fulcio-root.pem -noout -text |
  sed -n '/Subject Key Identifier/{n;p;}'

openssl x509 -in fulcio-intermediate.pem -noout -text |
  sed -n '/Authority Key Identifier/{n;p;}'
```

OpenSSL formatting varies by release, so use parsed DER in an automated gate. The intermediate AKI key identifier must equal the root SKI. For a self-signed root, an optional root AKI must equal its own SKI.

Do not accept an issuer name match as a substitute. Several roots can share the same Subject.

## Check Validity Containment and Algorithms

```bash
openssl x509 -in fulcio-root.pem -noout -startdate -enddate
openssl x509 -in fulcio-intermediate.pem -noout -startdate -enddate

openssl x509 -in fulcio-root.pem -noout -text |
  grep -E 'Public-Key|ASN1 OID|Signature Algorithm' | head

openssl x509 -in fulcio-intermediate.pem -noout -text |
  grep -E 'Public-Key|ASN1 OID|Signature Algorithm' | head
```

The intermediate must not start before the root becomes valid or expire after the root. Account for intended ceremony clock skew explicitly rather than making the root validity arbitrarily broad.

For ECDSA, confirm the named curve, not merely `id-ecPublicKey`. For RSA, confirm 4096 bits if following the recommendation. Review both the certificate public-key scheme and the parent's signature algorithm used to sign it.

## Verify Path Construction

Use the root as the trust anchor and the intermediate as the certificate being checked:

```bash
openssl verify \
  -show_chain \
  -check_ss_sig \
  -CAfile fulcio-root.pem \
  -purpose any \
  fulcio-intermediate.pem
```

`OK` proves one OpenSSL path could be built at the current time. It does **not** prove exact usages, criticality, 160-bit randomness, organization/CN presence, recommended strength, or Sigstore-specific policy. Keep the manual/parser checks.

For a representative issued leaf:

```bash
openssl verify \
  -show_chain \
  -CAfile fulcio-root.pem \
  -untrusted fulcio-intermediate.pem \
  -purpose any \
  issued-leaf.pem
```

The leaf test catches some chaining constraints, but leaf profile validation is a separate checklist: empty Subject, exactly one critical SAN GeneralName, critical Digital Signature usage, Code Signing EKU, issuer OID, ten-minute lifetime, and CT evidence.

## Verify the Active Signer Matches Certificate Zero

For `fileca`, compare the private key's public SPKI with the intermediate:

```bash
openssl pkey \
  -in fulcio-intermediate-key.pem \
  -passin env:FULCIO_FILECA_PASSWORD \
  -pubout \
  -outform DER |
  openssl dgst -sha256

openssl x509 \
  -in fulcio-intermediate.pem \
  -pubkey \
  -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256
```

For KMS/HSM, export or query only the public key and compute the same SPKI fingerprint. It must match certificate zero exactly. Be precise about provider key version; an alias that moved after certification is a different signer.

## Let a Pinned Fulcio Build Enforce Its Runtime Checks

Current `kmsca`, `fileca`, and `tinkca` call Fulcio's shared `VerifyCertChain` routine. It:

- builds a path with the last certificate as root;
- checks Code Signing usage;
- requires certificate zero to be a CA;
- requires Code Signing EKU on certificate zero when the chain contains a parent;
- compares certificate zero with the signer's public key; and
- applies Sigstore's public-key strength checks.

Start the exact production binary against staged copies of the key resource and chain. A successful startup is an important integration gate, but not a replacement for the full profile audit: the runtime function does not explicitly check every normative root/intermediate field listed above.

The current `pkcs11ca` implementation does not call that shared validation and loads only one CA certificate. Give it an independent profile/key-match gate and account for its different chain model.

## Make Validation Reproducible

Store a machine-readable ceremony report containing:

- specification URL and commit;
- Fulcio release/commit and Go/OpenSSL versions;
- complete DER/PEM fingerprints;
- parsed Subject and Issuer;
- serial and entropy-generation record;
- validity interval;
- Basic Constraints, Key Usage, EKU, SKI, and AKI including criticality;
- public key and signature algorithms;
- root/intermediate path result;
- signer SPKI comparison; and
- positive issuance plus negative test results.

Fail the pipeline on an extra usage or missing critical marker. Warnings tend to become permanent PKI debt once a root has been distributed.

## Official Documentation

- [Normative Sigstore Fulcio certificate profile](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#7-certificate-profile)
- [Fulcio repository certificate specification](https://github.com/sigstore/fulcio/blob/main/docs/certificate-specification.md)
- [Fulcio CA certificate requirements](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#ca-certificate-requirements)
- [Fulcio runtime chain validation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/common.go)
- [Fulcio Certificate Maker and templates](https://github.com/sigstore/fulcio/blob/main/docs/certificate-maker.md)
- [RFC 5280 certificate and CRL profile](https://www.rfc-editor.org/rfc/rfc5280)
- [OpenSSL `x509` command](https://docs.openssl.org/master/man1/openssl-x509/)
- [OpenSSL `verify` command](https://docs.openssl.org/master/man1/openssl-verify/)

## Conclusion

Validate a Fulcio CA as a profile, not merely a signature chain. Exact critical usages, names, identifiers, serials, validity containment, strength, key match, ordering, and runtime behavior all matter; capture them in a reproducible gate before a root reaches Cosign clients.
