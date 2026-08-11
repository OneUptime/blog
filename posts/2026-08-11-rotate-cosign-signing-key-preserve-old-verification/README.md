# How to Rotate a Cosign Signing Key Without Breaking Verification of Older Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Key Rotation, Image Signing, KMS, Supply Chain Security

Description: Rotate Cosign keys through an overlap period while preserving old public keys, restricting their future authority, and verifying historical image digests.

---

Rotating a Cosign key should change who may sign future releases without rewriting history. Existing image signatures remain cryptographically bound to the old public key. They keep verifying only while verifiers retain an appropriate trust path for that key and the signature artifacts remain available.

The core pattern is add, overlap, cut over, restrict, and retain. A compromise requires a stricter variant because continuing to trust the old key for arbitrary new digests would preserve the attacker's authority.

## Inventory before changing trust

Record:

- the old public key and a securely calculated fingerprint;
- the KMS key URI or key identifier, if applicable;
- repositories and artifact types it may sign;
- immutable digests of supported historical releases;
- policies, clusters, CI jobs, and offline verifiers that trust it;
- signature storage and any `COSIGN_REPOSITORY` mapping;
- transparency or timestamp evidence available for old signatures.

Verify representative old images before rotation:

```bash
cosign verify \
  --key=/etc/cosign/keys/release-2025.pub \
  registry.example.com/team/api@sha256:OLD_RELEASE_DIGEST
```

Save the result and policy version. This baseline distinguishes a preexisting retention problem from a rotation regression.

## Generate the new key without overwriting the old one

For a local test key, Cosign supports a custom output prefix:

```bash
cosign generate-key-pair \
  --output-key-prefix release-2026
```

This creates `release-2026.key` and `release-2026.pub`; it does not replace `release-2025.pub`. Protect the encrypted private key and its password separately. Production signing should generally use an approved KMS or hardware-backed service so private key operations and access logs remain controlled:

```bash
cosign generate-key-pair \
  --kms awskms:///alias/container-release-2026

cosign public-key \
  --key awskms:///alias/container-release-2026 \
  --outfile release-2026.pub
```

KMS URI syntax is provider-specific. Validate the exact URI and key-creation permissions against Cosign's official KMS documentation and the provider's documentation.

Distribute only the new public key and metadata through the same authenticated channel used for policy changes. A public key is not secret, but substituting it would redirect trust.

## Add both keys during overlap

Update verifiers to accept either authorized key before the first new-key signature is published. A simple CI gate can express the OR relationship explicitly:

```bash
verify_with_rotation_set() {
  image=$1

  if cosign verify --key=release-2026.pub "$image" >/dev/null; then
    return 0
  fi

  cosign verify --key=release-2025.pub "$image" >/dev/null
}

verify_with_rotation_set \
  registry.example.com/team/api@sha256:REPLACE_WITH_DIGEST
```

Preserve the first verifier's failure only as diagnostic data; the policy is successful if either trusted key validates. Use a policy engine's documented multiple-authority semantics in Kubernetes rather than translating this shell blindly.

During planned overlap, sign a canary digest with the new key and verify it from every target environment:

```bash
cosign sign \
  --key awskms:///alias/container-release-2026 \
  registry.example.com/team/api@sha256:CANARY_DIGEST
```

Do not move production signing until admission controllers, promotion jobs, disaster-recovery environments, and offline verifiers recognize the new public key.

## Decide whether to dual-sign

Dual-signing selected releases during the overlap can prove both trust paths work:

```bash
cosign sign --key="$OLD_KMS_URI" "$IMAGE_BY_DIGEST"
cosign sign --key="$NEW_KMS_URI" "$IMAGE_BY_DIGEST"
```

This is not always necessary. If policy accepts either key, one new-key signature is enough after verifiers have been updated. Dual-signing adds registry artifacts and can complicate assumptions about signature count.

Do not run concurrent append operations without testing the Cosign/storage version. Legacy signature storage used read-append-write behavior with race concerns. Serialize signing for a subject and verify the final registry state.

## Cut over future signing

After successful overlap:

1. remove old-key signing permission from CI;
2. disable or restrict the old KMS key according to retention policy;
3. make the new key the only key for ordinary new releases;
4. remove the old key from broad “any digest in this repository” verification;
5. preserve a narrow historical trust rule for approved old digests.

That last distinction matters. If every verifier trusts the old public key forever for arbitrary future artifacts, the old private key remains valuable to an attacker. Historical verification should be scoped by an allowlist, release ledger, trusted signing-time cutoff, or a policy-engine mechanism that expresses equivalent constraints.

For a manageable release set, an immutable digest ledger is straightforward:

```text
sha256:old-a...  accepted with release-2025.pub
sha256:old-b...  accepted with release-2025.pub
sha256:new-c...  accepted with release-2026.pub
```

Protect and audit that ledger.

## Handle compromise differently

Planned rotation assumes the old key remained confidential. If compromise is suspected:

- stop old-key signing immediately;
- remove broad trust for the old key;
- identify signatures and transparency entries created during the exposure window;
- allow only previously verified, known-good old digests if risk policy permits;
- rebuild or independently validate and re-sign supported releases with the new key;
- investigate CI, KMS access, registry writes, and policy changes;
- communicate a cutoff and remediation plan to consumers.

Adding the new key without removing old broad authority does not remediate compromise.

## Do not delete old evidence

Rotation does not require deleting old signatures, public keys, bundles, or trusted timestamp evidence. Removing those breaks audits and offline verification without improving control of the old private key.

Keep:

- old public keys and fingerprints;
- signed image/attestation referrers;
- Rekor or RFC 3161 timestamp evidence as applicable;
- key activation and retirement dates;
- approved digest ledger;
- policy versions and distribution records.

Delete or disable private signing capability according to KMS and incident policy, while retaining public verification material.

## Rotation checklist

- [ ] Baseline representative old-image verification.
- [ ] Generate a distinctly named new key or KMS version.
- [ ] Authenticate new public-key distribution.
- [ ] Add new trust before new signing begins.
- [ ] Test canary verification in CI, admission, DR, and offline environments.
- [ ] Serialize and verify any dual-signing operation.
- [ ] Remove old signing permission at cutover.
- [ ] Restrict old-key trust to approved historical digests or times.
- [ ] Preserve old public keys, signatures, bundles, and audit records.
- [ ] Use an immediate compromise procedure when confidentiality is in doubt.

## Official Documentation

- [Cosign key-pair generation command](https://github.com/sigstore/cosign/blob/main/doc/cosign_generate-key-pair.md)
- [Cosign public-key extraction command](https://github.com/sigstore/cosign/blob/main/doc/cosign_public-key.md)
- [Cosign signing command and KMS examples](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md)
- [Cosign verification command](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [Sigstore key-management documentation](https://docs.sigstore.dev/cosign/key_management/overview/)
- [Sigstore security model](https://docs.sigstore.dev/about/security/)

## Conclusion

Safe key rotation preserves old public verification material while narrowing the old key's authority over future artifacts. Add and distribute the new key, overlap long enough to test every verifier, cut signing over, and retain digest-scoped historical trust. If the old key may be compromised, revoke broad trust first and explicitly reestablish which old digests remain acceptable.
