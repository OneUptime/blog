# What Happens to Keyless Cosign Signatures After the Fulcio Certificate Expires?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Fulcio, Sigstore, Certificate Expiration, Keyless Signing

Description: Learn why short-lived Fulcio certificate expiry does not normally invalidate a keyless signature when trusted timestamp and transparency evidence are preserved.

---

Fulcio deliberately issues short-lived code-signing certificates. A keyless Cosign signature is expected to remain verifiable long after its certificate's `NotAfter` time. The verifier asks whether the certificate was valid at the trusted observer time bound to the signature-not whether it would be valid for a new signature today.

That historical decision depends on preserved transparency and timestamp evidence. A certificate and artifact signature alone may not be enough to establish that the signature existed while the certificate was valid.

## Why Fulcio certificates are short-lived

Traditional code-signing systems often give publishers long-lived private keys and certificates. Protecting, rotating, revoking, and distributing those keys is difficult. Sigstore changes the lifecycle:

1. Cosign creates an ephemeral key pair.
2. The signer authenticates through OIDC.
3. Fulcio issues a short-lived certificate binding the ephemeral public key to that identity.
4. Cosign signs the artifact with the in-memory private key.
5. Transparency evidence records the event.
6. The private key is discarded.

The certificate's short validity interval limits the trusted observer times at which verifiers accept signatures made with that key. It is not intended as the retention period for already published releases.

## Verification uses a trusted point in time

Web TLS normally checks whether a server certificate is valid now because the server is authenticating a live connection. Software signing needs a historical question: is there trusted evidence that the artifact signature existed while the signing certificate was valid?

Sigstore clients establish trusted time either from Rekor v1's `integratedTime`, authenticated by its `signedEntryTimestamp`, or from an RFC 3161 timestamp issued by a trusted timestamp authority. Rekor v2 supplies inclusion evidence but no signed time, so clients using it preserve a separate RFC 3161 timestamp. A verifier validates the artifact signature, certificate chain and identity, and required log/timestamp material, then checks each trusted observer time against the certificate path's validity interval.

Conceptually:

```text
certificate.NotBefore <= each trusted observer time <= certificate.NotAfter
```

The current wall clock may be months or years later. If all required checks succeed, normal certificate expiry does not make the historical signature invalid.

## What the verification bundle preserves

The standardized Sigstore bundle can carry:

- the artifact signature;
- the Fulcio leaf certificate for current public-good keyless bundles, with older or private-infrastructure bundles able to carry chain material;
- transparency-log entry and inclusion evidence;
- signed time information;
- other verification material required by the client specification.

For blobs, Cosign makes this explicit:

```bash
cosign sign-blob release.tar.gz \
  --bundle release.sigstore.json

cosign verify-blob release.tar.gz \
  --bundle release.sigstore.json \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER"
```

For container images, Cosign v3 stores the signature and its verification material together in a Sigstore bundle published as an OCI Image 1.1 referring artifact. Mirroring only the image can leave that evidence behind. Preserve referrers or use `cosign save` for a qualified offline workflow.

## What can still make an old signature fail

Certificate expiry is not the only verification input. An older keyless signature may fail because:

- its signature or bundle referrer was deleted by registry retention;
- a mirror copied the image but not its referrers;
- the verifier cannot obtain or was not given the required trusted root;
- the expected identity or issuer policy changed;
- the certificate chain, SCT, transparency entry, or signed-time evidence is absent or malformed;
- the signature targets a different image digest than the one being verified;
- the verifier is too old to support the stored bundle or current log format;
- trust administrators deliberately distrust an authority or signer after an incident.

Do not diagnose every historical failure as “the Fulcio certificate expired.” Inspect the verifier's exact error and each evidence layer.

## Do not bypass time and transparency checks

Cosign exposes flags such as `--insecure-ignore-tlog` and `--insecure-ignore-sct` for exceptional compatibility cases. The SCT is the certificate-transparency log's signed promise that the Fulcio certificate will be included; it is separate from the trusted timestamp bound to the artifact signature. These flags remove security checks and are not solutions to ordinary certificate expiry.

If verification succeeds only after ignoring the transparency log, the operator has changed the trust model rather than repaired the signature. Artifacts not included in an accepted log lose public auditability and may lack the trusted time needed to validate an expired short-lived certificate.

The correct repair is to restore complete verification material, use the appropriate trusted root, or republish/re-sign an independently validated artifact under an approved process.

## Identity policy still applies forever

A certificate proving “this GitHub workflow signed” is not the same as a policy saying that workflow is trusted. Keep the expected identity and issuer explicit during historical verification:

```bash
cosign verify \
  --certificate-identity='https://github.com/acme/api/.github/workflows/release.yml@refs/heads/main' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com' \
  registry.example.com/acme/api@sha256:REPLACE_WITH_DIGEST
```

Do not switch to `--certificate-identity-regexp='.*'` just to make an old artifact pass. Archive the historical policy that authorized the release, including repository and workflow governance at that time.

If an identity was compromised, transparency makes unexpected use detectable when the logs are monitored but does not automatically decide which artifacts remain acceptable. Incident response should identify approved digests and signing times, revoke broad authorization for the compromised identity, and re-sign known-good artifacts when policy requires it.

## Trusted roots also have a lifecycle

Verifiers obtain Fulcio CA chains, Rekor and certificate-transparency-log keys, and timestamp-authority chains through the Sigstore trusted root, commonly distributed with TUF. Authorities rotate over time. A complete historical verification system needs appropriate trusted material for the signature's time and bundle format.

Connected clients can update trust through the supported TUF flow. Air-gapped environments must import authenticated trusted-root updates on a controlled schedule. Retain transfer records and test representative old signatures before replacing local trust material.

Do not freeze an ancient verifier indefinitely. Security fixes and bundle-format support matter. Upgrade in a qualification environment and confirm that both historical and current signatures verify under the same explicit identity policy.

## Retention plan for long-lived releases

For artifacts that must verify for years:

1. pin the image by digest;
2. preserve its OCI signature and attestation referrers;
3. keep a Sigstore bundle or a `cosign save` export where required;
4. record expected identity, issuer, and policy version;
5. archive trusted-root provenance and update history;
6. periodically test verification with a patched supported client;
7. test registry retention, backups, restores, and mirrors;
8. maintain an incident process for identity or trust-root compromise.

The test should run with network access disabled if offline verification is a requirement.

## Expiration troubleshooting checklist

- [ ] Confirm the image digest is exactly the signed subject.
- [ ] Confirm signature/bundle referrers still exist.
- [ ] Inspect whether each required trusted observer time falls within certificate validity.
- [ ] Supply an authenticated, up-to-date trusted root containing the authority material valid for the signature's time.
- [ ] Enforce the archived expected identity and issuer.
- [ ] Use a patched Cosign release that supports the bundle format.
- [ ] Do not disable transparency or SCT checks to hide missing evidence.
- [ ] Check whether the signer or authority was intentionally distrusted.
- [ ] Re-sign only after independently validating the original artifact.

## Official Documentation

- [Sigstore security model and short-lived certificates](https://docs.sigstore.dev/about/security/)
- [Sigstore threat model verification sequence](https://docs.sigstore.dev/about/threat-model/)
- [Sigstore timestamp verification and Rekor versions](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Fulcio certificate issuing overview](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/)
- [Sigstore keyless Cosign quickstart and bundle verification](https://docs.sigstore.dev/quickstart/quickstart-cosign/)
- [Cosign verify-blob command](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-blob.md)
- [Sigstore bundle protobuf specifications](https://github.com/sigstore/protobuf-specs)

## Conclusion

Fulcio expiry closes the certificate-validity window against which trusted signature timestamps are checked; it does not normally erase trust in signatures accepted during that window. Preserve complete bundle and transparency evidence, trusted roots, the immutable subject digest, and the historical identity policy so verifiers can establish that the signature existed at a trusted time while the certificate was valid.
