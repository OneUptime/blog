# How Rekor Fits into Cosign Verification—and What Changes During a Transparency-Log Outage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rekor, Cosign, Sigstore, Transparency Log, Incident Response, Supply Chain Security

Description: Understand Rekor's evidence in keyless verification and design distinct signing, online-verification, and bundle-verification behavior for a log outage.

---

Rekor is Sigstore's signature transparency log. It records signed supply-chain metadata in an append-only, cryptographically verifiable structure. In a keyless Cosign workflow, Rekor is more than a public record of signatures: Rekor v1's signed time evidence helps a verifier establish that a short-lived Fulcio certificate was used while it was valid. Rekor v2 instead relies on a separate RFC 3161 timestamp authority for trusted signing time.

An outage affects new signing, online discovery, and verification of already bundled signatures differently. A sound incident plan distinguishes those paths instead of disabling transparency checks globally.

## What Rekor contributes

Fulcio issues short-lived code-signing certificates. In Cosign's keyless flow, the certificate binds a newly generated ephemeral public key to an authenticated OIDC identity. Cosign uses the matching ephemeral private key to sign an artifact digest.

Rekor accepts the signing material, records it, and returns signed transparency evidence. For Rekor v1, Sigstore's security and threat-model documentation describes verification as checking the artifact signature, Fulcio chain and identity, certificate-transparency evidence, Rekor signed time, and proof of log inclusion. Rekor v2 no longer returns a signed entry timestamp or integrated time; it returns an inclusion proof and signed checkpoint, while a trusted RFC 3161 timestamp supplies the time evidence.

This supports two important properties:

- **Trusted signing time:** Rekor v1's signed time, or an RFC 3161 timestamp used with Rekor v2, can show that signing occurred during the certificate's short validity window.
- **Auditability:** maintainers and monitors can find unexpected uses of an identity and check that the log stays append-only.

Rekor does not decide whether the signer is authorized for your image. The verifier still needs an exact identity/issuer or public-key policy. Nor does log inclusion prove the artifact is safe.

## Signing during an outage

Default public keyless signing depends on the Sigstore services involved in certificate issuance, timestamping, and transparency logging. If Rekor is unavailable, a new signing operation may fail even when the registry and Fulcio are reachable. Retrying with bounded backoff is reasonable for a brief service incident, but a release pipeline should eventually stop and report that the required evidence could not be produced.

Legacy Cosign signing paths retain the deprecated `--tlog-upload=false` flag for flows that intentionally do not upload to a transparency log. Cosign v3 rejects that flag with its default `--use-signing-config=true` path; an intentionally logless v3 flow instead uses a custom `--signing-config` containing no transparency-log service. Either approach changes the trust model. It is not a transparent failover for public keyless releases, and verification of such a signature requires an explicit policy such as `--insecure-ignore-tlog`; Cosign warns that artifacts not included in a log cannot be publicly verified.

Do not switch to a logless signing configuration or add bypass flags dynamically whenever Rekor times out. Doing so changes release evidence precisely when an attacker or service compromise may be hardest to observe.

Safer choices are:

1. pause the public keyless release and resume after service recovery;
2. use a predesigned private Sigstore deployment with its own trusted root and log;
3. use an approved long-lived or KMS key plus an independent trusted timestamp policy, if that is already part of the organization's documented trust model.

An emergency path must be reviewed and tested before the incident, not invented inside it.

## Verifying an existing signature online

When a verifier retrieves a signature from a registry, it may also need current trusted root material and transparency information. Bundles produced by Cosign v3's default public signing path carry the transparency evidence with the signature, so a verifier normally checks that evidence locally rather than querying Rekor. Legacy or otherwise non-bundled Rekor v1 verification may query Rekor for an entry and inclusion proof. Rekor v2 removes Rekor v1's entry/proof lookup and search APIs and requires signing clients to store the returned inclusion proof and checkpoint in a bundle; it still exposes tile, entry, and checkpoint endpoints for monitors and proof computation. A Rekor outage does not prevent verification when the required log evidence and trusted material are available locally. It can block verification of a historical Rekor v1 signature when a gate must fall back to a live lookup because usable bundled evidence was not retained.

Do not turn “could not contact a dependency” into “signature accepted.” Distinguish these outcomes in logs and metrics:

- signature or policy invalid;
- signature/referrer absent;
- registry unavailable;
- trusted-root material unavailable;
- transparency service unavailable;
- verification successful.

That distinction lets operators use an approved availability policy without hiding a true authorization failure.

## Verifying with complete bundled evidence

The Sigstore bundle format is designed to carry the signature, certificate, timestamps, and transparency-log verification material needed for offline verification. Cosign's current signing command can write verification material with `--bundle`, and its bundle tooling can create or inspect protobuf bundles.

For a blob, the workflow is explicit:

```bash
cosign sign-blob artifact.tar.gz \
  --bundle artifact.sigstore.json

cosign verify-blob artifact.tar.gz \
  --bundle artifact.sigstore.json \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER"
```

For container images, preserve the signature referring artifact and its bundled verification material during mirroring. Cosign also provides `cosign save --dir ...` and `cosign verify --local-image ...` for an on-disk signed image. Supply a previously distributed Sigstore `TrustedRoot` JSON file with `--trusted-root` in a disconnected verification environment.

A complete bundle permits cryptographic checking of embedded log evidence without a live Rekor query. It does not provide knowledge of events that happened after the trusted material was exported, such as a later trust-root change. Offline environments need a controlled refresh process.

## Availability policy: fail closed, fail open, or defer

Security policy and workload criticality determine outage behavior:

- **Fail closed:** reject new releases when required verification cannot complete. Appropriate for high-assurance production changes.
- **Use cached, already-verified digests:** permit only artifacts whose immutable digest and successful verification decision were recorded before the outage. Do not re-resolve mutable tags.
- **Verify complete bundles offline:** accept only when all required bundle and trusted-root checks succeed locally.
- **Defer noncritical promotion:** queue releases and resume after dependencies recover.
- **Emergency bypass:** if the organization permits one, require explicit authorization, narrow scope and duration, immutable digest allowlists, audit records, and mandatory post-incident revalidation.

“Fail open for every signed image” is not a useful policy because the system could not determine that those images were signed by an authorized identity.

## Recovery after Rekor returns

After service recovery:

1. Restore normal signing without bypass flags.
2. Verify whether queued signing operations completed once or created duplicates.
3. Revalidate artifacts admitted under cached or emergency policy.
4. Using retained bundles or your monitor's index, check transparency-log entries for expected release identities and digests.
5. Update offline trusted roots through the approved channel.
6. Review monitors for unexpected certificates or entries during the incident window.
7. Remove temporary exceptions and confirm admission policy is enforcing normally.

Because transparency provides auditability, the recovery procedure should include log review rather than only a service-health check.

## Outage-readiness checklist

- [ ] Identify which signing and verification paths contact public or private Rekor.
- [ ] Produce and retain complete Sigstore bundles where offline verification is required.
- [ ] Export trusted roots through an authenticated, versioned process.
- [ ] Pin images by digest and cache only successful digest-specific decisions.
- [ ] Monitor registry, trust-root, Fulcio, timestamp-authority, Rekor, and policy errors separately.
- [ ] Document whether each environment fails closed, defers, or uses offline bundles.
- [ ] Prohibit automatic insertion of `--insecure-ignore-tlog`.
- [ ] Time-limit and audit any emergency digest allowlist.
- [ ] Reverify and review transparency entries after recovery.
- [ ] Test the outage procedure without disconnecting production safeguards.

## Official Documentation

- [Rekor overview](https://docs.sigstore.dev/logging/overview/)
- [Sigstore security model](https://docs.sigstore.dev/about/security/)
- [Sigstore threat model and verification flow](https://docs.sigstore.dev/about/threat-model/)
- [Cosign signing command and transparency options](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md)
- [Cosign verification command and transparency options](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [Cosign bundle command](https://github.com/sigstore/cosign/blob/main/doc/cosign_bundle.md)

## Conclusion

Rekor supplies public-audit evidence for keyless signatures; Rekor v1 also supplies signed time, while Rekor v2 relies on an RFC 3161 timestamp authority for trusted time. During an outage, pause new signing or use a preapproved alternative trust path, while previously signed artifacts can remain verifiable when complete bundles and trusted roots are available. Design that behavior in advance and never turn off transparency checks as an unreviewed retry strategy.
