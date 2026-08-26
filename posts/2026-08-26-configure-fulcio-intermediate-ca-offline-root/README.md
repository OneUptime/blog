# How to Configure Fulcio as an Intermediate CA Beneath an Offline Root

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Intermediate CA, Offline Root, Private PKI, KMS, X.509

Description: Build and validate a profile-compliant Fulcio intermediate beneath an offline root, load the signer-first chain into Fulcio, distribute stable root trust, and rotate the online CA safely.

---

Running Fulcio beneath an offline root separates durable trust from online issuance. The root key is activated only for controlled ceremonies; Fulcio uses a different intermediate key to issue its ten-minute code-signing certificates. If the online key or workload is compromised, you can remove and replace the intermediate while keeping the root installed in clients.

Fulcio does not request an intermediate from the root for you. The ceremony must certify the exact public key used by the selected `kmsca`, `tinkca`, or `fileca` signer and return a PEM chain ordered from that intermediate to the root.

## Design the Hierarchy First

A practical two-level hierarchy is:

```text
Offline Fulcio Root CA
└── Online Fulcio Intermediate CA (pathlen:0, Code Signing EKU)
    └── Ten-minute identity certificates issued by Fulcio
```

Use separate hierarchies for production, staging, and local development. A staging intermediate beneath the production root is still production-trusted unless every verifier adds additional constraints correctly; a separate staging root makes accidental cross-environment trust much harder.

Keep the offline root key outside the Fulcio cluster. An offline host, disconnected HSM, or tightly controlled KMS ceremony can all satisfy the design if authorization, audit, backup, and recovery match the threat model. “Offline” is an operational property, not a filename called `root.key` on the Fulcio node.

## Validate the Root Profile

Sigstore's current Fulcio profile requires a root with:

- a Subject containing both organization and common name;
- an identical Issuer because it is self-signed;
- critical Key Usage containing only Certificate Sign and CRL Sign;
- critical Basic Constraints with `CA:TRUE`;
- no Extended Key Usage;
- a Subject Key Identifier;
- a unique, random, positive 160-bit serial; and
- RFC 5280 compliance.

ECDSA P-384 or stronger, or RSA-4096, and a lifetime such as ten years are recommendations. If an Authority Key Identifier is present on the root, it must equal the root's SKI.

Inspect the ceremony's existing root before using it:

```bash
openssl x509 -in offline-root.pem -noout \
  -subject -issuer -serial -dates -text

openssl verify \
  -CAfile offline-root.pem \
  -check_ss_sig \
  offline-root.pem
```

Do not assume that being self-signed makes a certificate a valid Fulcio root. Check criticality, exact usages, identifiers, serial, algorithm, and names against the profile.

## Create the Online Intermediate Key

Generate the intermediate key in the backend Fulcio will actually use. For production, `kmsca` is usually the cleanest choice. Export the SubjectPublicKeyInfo only and record its SHA-256 fingerprint:

```bash
openssl pkey \
  -pubin \
  -in fulcio-intermediate-public.pem \
  -outform DER |
  openssl dgst -sha256
```

Keep the provider's immutable key resource and this fingerprint in the ceremony request. A CSR is useful when the provider can have the nonexportable key sign one, but it is not the trust decision: the ceremony must independently compare the CSR/public key with the approved provider key and validate the CSR signature.

## Issue the Intermediate During the Offline Ceremony

The intermediate certificate must contain:

- a Subject with organization and common name;
- an Issuer equal to the root Subject;
- critical Certificate Sign and CRL Sign Key Usage, with no other usages;
- noncritical Code Signing Extended Key Usage, with no other EKUs;
- critical `CA:TRUE` Basic Constraints, preferably `pathlen:0`;
- an SKI and an AKI equal to the root's SKI;
- a unique, random, positive 160-bit serial; and
- a validity interval contained within the root's validity.

One OpenSSL extension file for a two-level hierarchy is:

```ini
[ fulcio_intermediate ]
basicConstraints = critical,CA:true,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
extendedKeyUsage = codeSigning
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
```

On the offline ceremony system, OpenSSL can issue directly for an approved public key without importing the intermediate private key:

```bash
# Force the high bit so the positive random serial is a full 160 bits.
SERIAL_HEX="8$(openssl rand -hex 20 | cut -c 2-)"

openssl x509 -new \
  -force_pubkey fulcio-intermediate-public.pem \
  -subj '/O=Example Corporation/CN=Example Fulcio Intermediate CA' \
  -CA offline-root.pem \
  -CAkey offline-root.key \
  -set_serial "0x${SERIAL_HEX}" \
  -days 1095 \
  -extfile intermediate.cnf \
  -extensions fulcio_intermediate \
  -out fulcio-intermediate.pem
```

The example uses a local root key only to show the X.509 operation. Substitute the audited HSM or offline signer workflow used by your root. Check the calculated `notAfter` explicitly; `-days 1095` does not override the rule that the intermediate must expire no later than its parent.

Fulcio's `certificate-maker` can also construct root/intermediate chains with AWS, Google Cloud, Azure, or Vault KMS signers. Pin its source version, use a custom template that includes your required organization, and independently validate its output. The current embedded templates and tool behavior are implementation inputs, not a substitute for checking the normative certificate profile.

## Validate the Ceremony Output

Verify the path and inspect every extension:

```bash
openssl verify \
  -CAfile offline-root.pem \
  -purpose any \
  fulcio-intermediate.pem

openssl x509 -in fulcio-intermediate.pem -noout \
  -subject -issuer -serial -dates -text

openssl x509 -in fulcio-intermediate.pem -pubkey -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256
```

The last digest must equal the fingerprint recorded from the online signer. Also verify:

- the intermediate's AKI equals the root's SKI;
- Basic Constraints and Key Usage are critical;
- Code Signing is the only EKU and is not marked critical;
- the serial is positive and 20 octets of random value;
- `pathlen:0` is present unless a reviewed hierarchy requires otherwise; and
- root and intermediate use compatible signature schemes.

Keep a signed ceremony manifest containing both certificate fingerprints, the public-key fingerprint, serial, validity interval, provider resource, profile-check results, participants, and tool versions.

## Build Fulcio's Chain in the Correct Order

Fulcio expects its issuing certificate first and the trust anchor last:

```bash
cat fulcio-intermediate.pem offline-root.pem > fulcio-ca-chain.pem

openssl crl2pkcs7 \
  -nocrl \
  -certfile fulcio-ca-chain.pem |
  openssl pkcs7 -print_certs -noout
```

For a KMS-backed deployment:

```bash
fulcio-server serve \
  --ca=kmsca \
  --kms-resource='gcpkms://projects/acme/locations/global/keyRings/sigstore/cryptoKeys/fulcio-intermediate/cryptoKeyVersions/1' \
  --kms-cert-chain-path=/etc/fulcio/fulcio-ca-chain.pem \
  --config-path=/etc/fulcio-config/config.yaml \
  --ct-log-url=https://ct.example.com/acme-2026 \
  --ct-log-public-key-path=/etc/fulcio/ct-public-key.pem
```

At startup, current Fulcio verifies the chain for Code Signing, verifies that its first certificate is a CA, requires the Code Signing EKU when a chain has more than one certificate, and compares the first certificate's public key with the signer. A reversed, incomplete, expired, wrong-EKU, or mismatched chain fails startup.

The equivalent file-backed configuration uses the same signer-first chain with `--fileca-cert`, but Fulcio's architecture classifies password-protected `fileca` as testing-only. Do not move the offline root key onto the server merely to make setup easier.

## Test a Real Issuance Path

After startup, issue a certificate with a synthetic, nonproduction OIDC identity and retrieve the advertised chain:

```bash
curl --fail --silent \
  https://fulcio.example.com/api/v2/trustBundle |
  jq -r '.chains[0].certificates[]' > observed-chain.pem
```

The endpoint is useful for inspection, not trust bootstrap. Compare its fingerprints against the ceremony manifest. Then verify an issued leaf:

```bash
openssl verify \
  -CAfile offline-root.pem \
  -untrusted fulcio-intermediate.pem \
  -purpose any \
  issued-leaf.pem
```

Inspect the leaf separately for Fulcio's requirements: empty Subject, exactly one critical SAN GeneralName, critical Digital Signature Key Usage, Code Signing EKU, ten-minute validity, issuer extension, AKI/SKI, and embedded SCT or other accepted CT evidence.

## Distribute Trust Before Enabling Issuance

Clients should receive the offline root and the private CT, Rekor, and timestamp verification material through an authenticated Sigstore `TrustedRoot`, preferably as a target in a private TUF repository. A TLS connection to `/api/v2/trustBundle` does not authorize that response as a new trust anchor unless the TLS trust and service identity already provide the required bootstrap.

Publish new intermediate and service material before routing signers to it. Keep the old chain's public verification material for artifacts created during its validity interval. TUF metadata and `TrustedRoot` validity intervals let clients distinguish active signing services from historical verification material.

## Rotate the Intermediate, Not the Root

For routine rotation:

1. create a new online intermediate key;
2. certify it in a new offline ceremony;
3. publish the new trust material while retaining the old material;
4. roll Fulcio to the new key resource and matching chain;
5. verify issuance and artifact bundles from both sides of the cutover; and
6. remove old signing authorization after all Fulcio replicas have moved.

If the intermediate is compromised, stop issuance first, remove the compromised workload's KMS access, publish verifier policy that rejects affected identities or artifact digests as appropriate, and create a new intermediate. Short-lived Fulcio leaves reduce exposure to new issuance; they do not erase already logged signatures with valid time evidence.

## Official Documentation

- [Normative Fulcio certificate profile](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#7-certificate-profile)
- [Fulcio CA chain requirements](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#ca-certificate-requirements)
- [Fulcio KMS and file signing backends](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#signing-backend)
- [Fulcio startup chain and key validation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/common.go)
- [Fulcio Certificate Maker](https://github.com/sigstore/fulcio/blob/main/docs/certificate-maker.md)
- [Sigstore trusted-root protobuf](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto)
- [Cosign custom infrastructure configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/)

## Conclusion

Keep the root genuinely offline, certify only the exact online signer Fulcio will use, and validate the complete profile rather than just an OpenSSL success message. A signer-first intermediate chain plus pre-distributed root trust gives you routine online rotation without turning every incident into a root replacement.
