# Why Cosign Cannot Verify a Private Fulcio Certificate Without Rekor and CT Log Trust Material

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Cosign, Rekor, Certificate Transparency, TrustedRoot, Sigstore, Keyless Verification

Description: Understand each proof in private keyless verification, correct the claim that X.509 inherently needs Rekor, assemble complete Sigstore trust material, and diagnose the exact missing layer.

---

The title is intentionally broader than the underlying cryptography. An X.509 certificate path needs its Fulcio CA root and intermediates; X.509 itself does not need Rekor or a certificate-transparency key. Cosign's secure keyless verification performs additional Sigstore checks by default, and those checks need authenticated CT and artifact-transparency or timestamp material.

That distinction matters. Adding the Fulcio root can fix `certificate signed by unknown authority`, but it cannot authenticate an embedded SCT, a Rekor signed entry timestamp, an inclusion promise/proof, or the time at which a short-lived certificate was used. Disabling all of those checks can make a laboratory command succeed, but it is no longer the normal Sigstore security model.

## Map Each Verification Layer

A private keyless signature normally involves these independent statements:

| Evidence | What Cosign learns | Trusted material required |
| --- | --- | --- |
| artifact signature | the holder of the leaf private key signed this digest | public key in the leaf certificate |
| Fulcio path | an authorized CA bound that public key to an identity | Fulcio root and intermediates |
| certificate identity | which SAN and OIDC issuer Fulcio certified | exact identity and issuer policy |
| CT SCT | Fulcio committed the certificate/precertificate to its issuance log | CT log public key and issuing CA certificate |
| Rekor evidence | the artifact signature was recorded by the selected transparency service | Rekor log public key, log ID/origin, and validity interval |
| trusted time | the signature existed while the ten-minute certificate was valid | Rekor v1 integrated time or an accepted RFC 3161 TSA, depending on the design |

The private Fulcio root authorizes certificate issuance. It does not authorize the CT or Rekor log to speak, and it cannot verify either log's signatures. Conversely, a valid Rekor proof does not make an untrusted Fulcio chain valid.

## Understand Why Short-Lived Certificates Need Time Evidence

Fulcio certificates are valid for about ten minutes. Long-term verification asks whether the artifact signature was made while the certificate was valid, not whether the certificate is unexpired today.

Rekor v1's signed log evidence supplies an integrated time that Cosign can compare with the leaf validity interval. In the newer Rekor v2 design, a separate RFC 3161 timestamp authority provides time evidence. A private deployment can use an approved timestamp design instead of Rekor for some workflows; therefore the categorical claim “Rekor is always required” is not universally true. The signing configuration, bundle, verification policy, and `TrustedRoot` must agree on the selected services.

An untrusted timestamp inside a JSON document is just attacker-controlled data. Cosign needs the corresponding Rekor public key or TSA certificate chain to authenticate it.

## Understand Why the Fulcio CT Log Is Separate

Fulcio CT records certificate issuance. With the recommended embedded-SCT flow, Fulcio signs a poisoned precertificate, submits it to the CT log, receives a signed certificate timestamp, removes the poison, embeds the SCT-list extension, and signs the final leaf.

Cosign reconstructs the precertificate input and verifies the SCT against the CT log public key. That key is not in the leaf. It must arrive through authenticated trust material, and the SCT's log ID must match it.

Rekor records the artifact signature and digest. Fulcio CT records the certificate or precertificate. One cannot substitute for the other:

- a CT SCT says nothing about which artifact was signed;
- a Rekor entry does not independently authorize the CA that issued the leaf; and
- an X.509 root does not prove either transparency event.

## Recognize the Missing-Material Errors

Run Cosign with `--verbose` and classify the first failing layer:

```text
cert verification failed: x509: certificate signed by unknown authority
```

The private Fulcio CA chain is absent or wrong.

```text
ctfe public key not found for payload
```

The leaf contains an SCT whose log ID has no trusted CT key, or the wrong environment's CT material was loaded.

```text
rekor log public key not found for payload
```

The bundle's Rekor evidence has no matching trusted Rekor key.

Other failures such as an invalid SCT signature, invalid signed entry timestamp, untrusted timestamp authority, no matching signature, or certificate identity mismatch mean the relevant material exists but does not validate the evidence. Do not “fix” those by adding unrelated public keys.

## Assemble One Complete Private `TrustedRoot`

Current Cosign can create a Sigstore trusted-root JSON document:

```bash
cosign trusted-root create \
  --no-default-fulcio \
  --no-default-ctfe \
  --no-default-rekor \
  --no-default-tsa \
  --fulcio='url=https://fulcio.example.com,certificate-chain=fulcio-ca-chain.pem,start-time=2026-08-01T00:00:00Z' \
  --ctfe='url=https://ct.example.com/acme-2026,public-key=ct-public-key.pem,start-time=2026-08-01T00:00:00Z,origin=acme-2026' \
  --rekor='url=https://rekor.example.com,public-key=rekor-public-key.pem,start-time=2026-08-01T00:00:00Z,origin=rekor.example.com' \
  --out trusted_root.json
```

If the design uses a timestamp authority, add its certificate chain with `--tsa`. If it has no Rekor service, do not invent one; create a matching `SigningConfig`, ensure the bundle contains accepted timestamp evidence, and test the exact Cosign release. Verification policy is versioned behavior.

The Fulcio `certificate-chain` input is the CA chain, not an issued ten-minute leaf. Use signer-first/root-last PEM order. Record fingerprints and correct start/end intervals for every authority. During rotation, retain old public material for bundles created inside its trusted interval.

Publish `trusted_root.json` through private TUF and bootstrap Cosign with that TUF repository's own initial root. A public Sigstore TUF cache cannot authenticate private keys simply because their service URLs are reachable.

## Use a Standardized Bundle

Cosign v3's preferred flow records the certificate, artifact signature, transparency evidence, and timestamp material in a Sigstore bundle. Verify it with the complete trusted root and exact identity policy:

```bash
cosign verify \
  --bundle artifact.sigstore.json \
  --trusted-root trusted_root.json \
  --certificate-identity='https://github.com/example/widget/.github/workflows/release.yml@refs/heads/main' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com' \
  registry.example.com/widget@sha256:DIGEST
```

The bundle carries evidence, not trust. An attacker can edit a bundle; the independently supplied `TrustedRoot` supplies the keys used to reject those edits.

Do not rely on a live query as the only verification path. A complete bundle supports offline cryptographic verification of included promises/proofs and timestamps with pre-distributed public material. Availability of the private services should not be confused with authenticity of their historical output.

## Prove Which Checks Are Failing

Inspect the leaf for an embedded SCT:

```bash
openssl x509 -in leaf.pem -noout -text |
  grep -A 14 'CT Precertificate SCTs'
```

Record the displayed Log ID and compare it with the SHA-256 identifier derived for the intended CT public key through a CT-aware tool. A key from another CT shard or environment will not verify the SCT even if it is a valid public key.

Then check the Fulcio path independently:

```bash
openssl verify \
  -CAfile fulcio-root.pem \
  -untrusted fulcio-intermediate.pem \
  -purpose any \
  leaf.pem
```

This isolates X.509 path building. It does not mean the artifact, identity policy, SCT, Rekor evidence, or trusted time passed.

Finally, inspect the bundle with the pinned Sigstore tooling and identify whether it contains Rekor v1, Rekor v2, or RFC 3161 evidence. Match that to the exact service key and validity interval in `trusted_root.json`.

## Use Bypass Flags Only to Demonstrate the Boundary

Current Cosign exposes:

```bash
cosign verify \
  --insecure-ignore-sct \
  --insecure-ignore-tlog \
  --certificate-identity='EXPECTED_IDENTITY' \
  --certificate-oidc-issuer='EXPECTED_ISSUER' \
  IMAGE_AT_DIGEST
```

These flags prove the title's premise is not an X.509 impossibility: with a trusted Fulcio CA and valid artifact signature, Cosign can be told to skip CT and artifact-log verification. Cosign labels the flags insecure because they remove transparency and auditability checks on which the standard keyless threat model relies.

Do not put these flags into a production verifier merely to silence missing private infrastructure. If an organization intentionally chooses a CA-only model, document that it is a different security design, provide another trustworthy time/revocation policy, and use tooling/policy that expresses that design explicitly.

## Avoid Common Trust Mix-Ups

- `fulcio-root.pem` is not a CT key.
- A CT public key is not a Rekor public key, even if both use ECDSA.
- The public-good CT/Rekor keys do not verify a private stack.
- Staging roots and logs do not verify production evidence.
- A `SigningConfig` names services but does not authenticate their output.
- A TUF `root.json` authenticates repository metadata; it is not itself the Fulcio CA chain.
- Fetching keys from the same untrusted endpoint during verification is not bootstrap.

Keep each environment's trusted root and TUF cache separate, and pin artifact verification to a digest plus exact certificate identity and issuer.

## Official Documentation

- [Cosign custom infrastructure requirements](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Cosign verification flags and transparency defaults](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [Cosign trusted-root creation](https://github.com/sigstore/cosign/blob/main/doc/cosign_trusted-root_create.md)
- [Sigstore trusted-root protobuf](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto)
- [Fulcio CT log and SCT verification design](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Fulcio security model](https://github.com/sigstore/fulcio/blob/main/docs/security-model.md)
- [Sigstore certificate issuance flow](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/)
- [Cosign timestamps, Rekor v1, and Rekor v2](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Sigstore bundle specification](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto)

## Conclusion

The private Fulcio root proves only the certificate path. Secure keyless verification also authenticates issuance transparency, artifact transparency or an approved timestamp, the artifact signature, and the exact identity. Supply all material in one independently trusted Sigstore `TrustedRoot`; use bypass flags only to demonstrate which security layer you removed.
