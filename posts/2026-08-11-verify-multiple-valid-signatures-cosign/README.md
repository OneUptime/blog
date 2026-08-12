# How to Verify an Image Has More Than One Valid Signature with Cosign

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Multiple Signatures, Threshold Policy, Image Verification, Supply Chain Security

Description: Enforce independent multi-signer approval by verifying the same immutable image digest separately against each required key or keyless identity.

---

`cosign verify` succeeds when it finds at least one signature that satisfies the supplied trust policy. That is the right default for a single signer, but it does not express “the build service and the security approver both signed this image.” Passing multiple image arguments also verifies multiple images; it is not a multi-signature threshold.

To require more than one signature, define independent authorities and verify the same immutable subject against each one. A policy engine can express the threshold at admission, while a shell gate can run separate Cosign commands and require every exit status.

## Start with one subject digest

Capture the image manifest or index digest from the trusted build:

```bash
IMAGE=registry.example.com/team/api@sha256:REPLACE_WITH_DIGEST
```

All required parties must sign that exact subject. If one signs a tag after it moved, an OCI index while another signs a platform child, or a mirror rewrites the manifest, the signatures do not form a threshold over one object.

For example, two key-backed authorities sign serially:

```bash
cosign sign --key="$RELEASE_KMS_URI" "$IMAGE"
cosign sign --key="$SECURITY_KMS_URI" "$IMAGE"
```

Serialize and verify writes for the pinned Cosign/registry combination. Legacy signature storage could involve read-append-write behavior; concurrent operations risk losing one update.

## Verify two public keys independently

Use `set -e` so either failed verification stops the gate:

```bash
#!/usr/bin/env bash
set -euo pipefail

IMAGE='registry.example.com/team/api@sha256:REPLACE_WITH_DIGEST'

cosign verify \
  --key=/etc/cosign/release.pub \
  "$IMAGE" >/dev/null

cosign verify \
  --key=/etc/cosign/security.pub \
  "$IMAGE" >/dev/null

printf 'Both required signing authorities verified %s\n' "$IMAGE"
```

Each command answers a distinct question. The first cannot be satisfied by the security key and the second cannot be satisfied by the release key. Do not combine both PEM blocks into an undocumented key bundle and assume Cosign applies AND semantics.

Make sure the two public keys represent separate approval domains. Two keys accessible to the same compromised CI job do not provide meaningful two-party control.

## Verify two keyless identities independently

Keyless threshold policy should name exact identities:

```bash
#!/usr/bin/env bash
set -euo pipefail

IMAGE='registry.example.com/team/api@sha256:REPLACE_WITH_DIGEST'
ISSUER='https://token.actions.githubusercontent.com'
BUILD_ID='https://github.com/acme/api/.github/workflows/build.yml@refs/heads/main'
APPROVAL_ID='https://github.com/acme/security/.github/workflows/approve-api.yml@refs/heads/main'

cosign verify \
  --certificate-identity="$BUILD_ID" \
  --certificate-oidc-issuer="$ISSUER" \
  "$IMAGE" >/dev/null

cosign verify \
  --certificate-identity="$APPROVAL_ID" \
  --certificate-oidc-issuer="$ISSUER" \
  "$IMAGE" >/dev/null
```

The identities should be controlled by different protected workflows, repositories, environments, or reviewer groups consistent with the intended separation of duties. Requiring the same identity twice only proves that at least one acceptable signature was found twice.

Do not use broad regexes to create artificial diversity. A pattern matching every workflow in an organization cannot prove which two workflows signed.

## Why counting JSON elements is usually the wrong gate

Cosign can print matching signature payloads, and an operator can inspect them:

```bash
cosign verify --key=release.pub "$IMAGE" | jq .
```

Counting output objects proves only that several signatures matched the same supplied condition. The same key could have signed twice, a retry could create duplicates, or several certificates could represent the same authority. Output shape can also change across major versions.

Threshold policy should count distinct trusted authorities, not registry objects. Run one verification per authority or use a policy engine with documented threshold semantics.

## Express the threshold in Kyverno

Kyverno 1.18's stable `ImageValidatingPolicy` uses named attestors and CEL. A two-of-two public-key policy is shaped like this:

```yaml
apiVersion: policies.kyverno.io/v1
kind: ImageValidatingPolicy
metadata:
  name: require-release-and-security-signatures
spec:
  failurePolicy: Fail
  validationActions:
    - Deny
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  matchImageReferences:
    - glob: "registry.example.com/team/api*"
  validationConfigurations:
    mutateDigest: true
    verifyDigest: true
    required: true
  attestors:
    - name: release
      cosign:
        key:
          data: |-
            -----BEGIN PUBLIC KEY-----
            RELEASE_PUBLIC_KEY
            -----END PUBLIC KEY-----
    - name: security
      cosign:
        key:
          data: |-
            -----BEGIN PUBLIC KEY-----
            SECURITY_PUBLIC_KEY
            -----END PUBLIC KEY-----
  validations:
    - expression: >-
        (images.containers + images.initContainers + images.ephemeralContainers)
          .map(image, verifyImageSignatures(image, [attestors.release, attestors.security]))
          .all(count, count == 2)
      message: every matching image must be signed by both release and security
```

`verifyImageSignatures` returns the number of listed named attestors that verify, so comparing it with `2` requires both authorities. Use valid PEM data or documented KMS/CEL-loaded key material in a real policy. Test with zero, release-only, security-only, and both signatures.

Kyverno 1.17 began the legacy-policy deprecation schedule. In 1.18, `ClusterPolicy`, including its `verifyImages` rules, is deprecated and receives critical fixes only. Validate the exact CEL and attestor semantics against the installed CRD before deployment.

This policy works with Cosign 3's default Sigstore bundles when they are stored as OCI referrers alongside the image. Kyverno 1.18.2 pins a Cosign version that does not honor an alternate `source.repository` while discovering those bundles, so keep them in the subject repository or use a Kyverno build that includes the newer target-repository fix.

## Separate AND from rotation OR

Multiple keys appear in two common policies:

- **Threshold AND:** release and security must both sign.
- **Rotation OR:** old or new release key may sign during migration.

Confusing them can block every release or reduce two-party approval to one signer. Name policy groups explicitly and write a truth table:

| Release | Security | Result for two-of-two |
| --- | --- | --- |
| no | no | reject |
| yes | no | reject |
| no | yes | reject |
| yes | yes | accept |

For rotation, the last three rows may differ because old/new keys are alternatives within one authority group. Some policies require one signature from each group, where each group has an internal OR list.

## Preserve separation through the pipeline

A useful two-party flow is:

1. trusted builder pushes and signs the digest;
2. security automation independently verifies provenance and scan evidence;
3. security signs the same digest through a separately protected identity;
4. promotion verifies both authorities;
5. admission repeats the threshold at the destination registry.

The second signer should not trust a mutable tag or unauthenticated digest passed by the first job. It resolves and checks the immutable subject, verifies the first signature if required, and evaluates its own approval evidence.

## Troubleshoot missing thresholds

If only one authority verifies, check:

- both parties signed the same index/manifest digest;
- mirroring copied every signature artifact required by the selected storage mode, including all OCI 1.1 referrers or the legacy digest-derived signature tag;
- the signer and shell verifier use the same `COSIGN_REPOSITORY`; for Kyverno 1.18.2, keep Cosign 3 bundles in the subject repository because alternate-repository discovery is not supported;
- each verifier uses the intended public key or exact identity/issuer;
- registry permissions allow all signature objects to be discovered;
- a concurrent signing operation did not overwrite legacy signature state;
- the CEL threshold counts successful named attestors, not signatures returned by one attestor.

When signatures use OCI 1.1 referrer storage, use `oras discover` against the repository where Cosign stored them. It does not list Cosign's legacy digest-derived signature tag. Let cryptographic verification-not presence-decide validity.

## Multi-signer checklist

- [ ] Define each independent authority and why it is independent.
- [ ] Make every signer use the same immutable subject digest.
- [ ] Verify once per required key or exact keyless identity.
- [ ] Require all relevant process exit codes.
- [ ] Count authorities, not raw signature objects.
- [ ] Distinguish threshold AND from key-rotation OR.
- [ ] Test the complete truth table with missing-signature cases.
- [ ] Copy every signature artifact required by the selected storage mode during promotion.
- [ ] Reverify the threshold at the destination and at admission.
- [ ] Protect signer credentials/workflows in separate control domains.

## Official Documentation

- [Cosign verification command behavior](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign signing command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md)
- [Cosign registry support and OCI 1.1 signature storage](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Kyverno ImageValidatingPolicy](https://kyverno.io/docs/policy-types/image-validating-policy/)
- [Kyverno policy type status and deprecation schedule](https://kyverno.io/docs/policy-types/overview/)
- [OCI Distribution Specification referrers](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [ORAS discover command](https://oras.land/docs/commands/oras_discover/)

## Conclusion

More than one signature matters only when it represents more than one independently authorized signer. Verify the same digest separately against every required key or identity, or use a policy engine's tested threshold semantics. Counting registry objects or repeating one permissive verification does not create two-party approval.
