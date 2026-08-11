# How to Copy Container Images Without Losing Cosign Signatures, SBOMs, or Attestations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OCI Artifacts, Cosign, SBOM, Attestations, Container Registry, Image Promotion

Description: Build a verifiable image-promotion workflow that copies an immutable OCI subject and its complete referrer graph across registries.

---

A production image is often more than its runnable layers. Its registry graph may also contain Cosign signatures, SLSA provenance, vulnerability statements, and SBOM artifacts. A tool that copies only the image manifest or index can preserve the subject digest while silently leaving all of that evidence behind.

The safe unit of promotion is therefore an immutable subject digest plus the set of required referring artifacts. Copy the graph, compare it, and verify it at the destination before changing a deployment tag.

## Model the release as an OCI graph

In OCI 1.1, an attached artifact is a separate manifest with a `subject` descriptor. The registry's referrers API discovers manifests whose subject is a particular digest. A release can look like this:

```text
image index sha256:aaaa...
├── Cosign signature sha256:bbbb...
├── SLSA provenance  sha256:cccc...
├── SBOM artifact    sha256:dddd...
│   └── SBOM signature sha256:eeee...
└── linux/amd64 image manifest sha256:ffff...
```

Some relationships may be nested. A multi-platform index also references platform manifests in the forward direction, while signatures and attestations refer back to their subjects. Copy tooling must understand both the image/index content graph and the referrer graph.

Current Cosign stores signatures as OCI 1.1 referring artifacts by default. Legacy signatures may use digest-derived tags, and OCI Distribution 1.1 defines a tag-based fallback for registries without the native referrers API. Inventory the actual graph rather than assuming one storage scheme.

## Define the source by digest

Authenticate to both registries through their supported credential mechanism, then capture the immutable source:

```bash
SOURCE_REPO=source.example.com/team/payments
SOURCE_TAG=1.8.0
SOURCE_DIGEST=$(crane digest "$SOURCE_REPO:$SOURCE_TAG")
SOURCE="$SOURCE_REPO@$SOURCE_DIGEST"

printf '%s\n' "$SOURCE"
```

In CI, prefer the digest returned by the build-and-push step. Resolving a mutable tag later creates a race with another publisher.

Verify the source before copying. Promotion should not grant trust to an artifact that was never trusted at its origin:

```bash
cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$SOURCE"
```

Verify required attestations independently with `cosign verify-attestation` and evaluate their predicate contents. A valid attestation signature alone does not guarantee the predicate satisfies release policy.

## Inventory required referrers

Inspect the source graph:

```bash
oras discover --format json "$SOURCE" > source-referrers.json
```

Keep a machine-readable allowlist of required artifact types. For example, release policy might require at least one Cosign signature, one SLSA provenance attestation, and one SPDX or CycloneDX SBOM artifact. Do not require “at least three referrers” without checking types and signers; unrelated metadata could satisfy a count.

If the organization uses `COSIGN_REPOSITORY`, run discovery and copy against that repository as well. A signature repository is a separate part of the promotion design and will not be inferred by a generic image copy.

## Copy recursively with ORAS

ORAS documents recursive copy of an artifact and its referrers:

```bash
DEST_REPO=prod.example.net/team/payments

oras cp --recursive \
  "$SOURCE" \
  "$DEST_REPO:1.8.0"
```

The `--recursive` option is marked preview in current ORAS documentation. Pin an approved ORAS version and test it with both registry products before relying on it. The command supports explicit referrers modes when endpoints differ:

```bash
oras cp --recursive \
  --from-distribution-spec v1.1-referrers-api \
  --to-distribution-spec v1.1-referrers-tag \
  "$SOURCE" \
  "$DEST_REPO:1.8.0"
```

Use those options only after confirming actual endpoint behavior. The destination fallback tag can have concurrency and retention considerations documented in the OCI Distribution Specification.

Plain `docker pull/tag/push` and `crane copy` are useful for images but do not, by their basic command contract, promise recursive referrer copying. Do not substitute them without a separate metadata-copy step.

## Preserve the subject digest

After the copy, resolve the destination tag:

```bash
DEST_DIGEST=$(crane digest "$DEST_REPO:1.8.0")
test "$DEST_DIGEST" = "$SOURCE_DIGEST"
DEST="$DEST_REPO@$DEST_DIGEST"
```

If the assertion fails, stop. The destination may contain a platform-specific manifest rather than the index, a converted manifest, or a rebuilt artifact. Existing signatures correctly refuse to authorize changed content.

Digest preservation across repositories is possible because the manifest's bytes do not contain its registry hostname. However, any tool that rewrites the manifest changes its digest.

## Compare the destination graph

Discover the copied referrers:

```bash
oras discover --format json "$DEST" > destination-referrers.json
```

Compare artifact types and relationships, not only raw referrer digests. In some compatibility flows, representation can differ while the required evidence remains verifiable. The strongest end-to-end check is to run the same verification policy used by the destination runtime:

```bash
cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$DEST"

cosign verify-attestation \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  --type slsaprovenance1 \
  "$DEST" > verified-provenance.json
```

Use the predicate type actually emitted by your builder. Validate the verified statement's subject digest, builder identity, source repository, and other required fields with a policy engine or a carefully reviewed parser.

## Handle multi-platform subjects

ORAS copies all manifests of an image index, but attached evidence may target either the index or individual platform manifests. Inventory both levels when platform signatures or architecture-specific SBOMs are policy requirements.

List child digests from the index and discover each one:

```bash
crane manifest "$SOURCE" \
  | jq -r '.manifests[].digest' \
  | while read -r child; do
      oras discover "$SOURCE_REPO@$child"
    done
```

The source repository name stays the same while the digest changes. After promotion, repeat against the destination repository. A signature on the index does not imply that an independently distributed child manifest has its own signature.

## Protect credentials and TLS

ORAS provides separate source and destination credential, CA, and client-certificate options. Prefer registry config files, credential helpers, or workload identity instead of plaintext command-line passwords, which can leak through process listings and logs.

Install private registry CAs with `--from-ca-file` and `--to-ca-file` as appropriate. Do not use plaintext HTTP or insecure TLS modes in production. Those options weaken transport authentication even if artifact signatures are later checked.

## Promotion checklist

- [ ] Pin the source image or index by digest.
- [ ] Verify required signatures and attestations at the source.
- [ ] Inventory direct and nested referrers and their artifact types.
- [ ] Include any separate `COSIGN_REPOSITORY` in the plan.
- [ ] Use a pinned, tested tool mode that explicitly copies referrers.
- [ ] Assert that source and destination subject digests match.
- [ ] Discover and compare destination referrers.
- [ ] Verify signatures, predicate types, and predicate policy at the destination.
- [ ] Test multi-platform index and child-manifest requirements.
- [ ] Reverify after retention and garbage-collection jobs.
- [ ] Move the production tag only after all checks pass.

## Official Documentation

- [ORAS recursive copy command](https://oras.land/docs/commands/oras_cp/)
- [ORAS referrer discovery command](https://oras.land/docs/commands/oras_discover/)
- [OCI Distribution Specification referrers API](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [OCI Image Manifest subject field](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [Sigstore registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Cosign signature verification](https://docs.sigstore.dev/cosign/verifying/verify/)

## Conclusion

Copying a signed release safely is a graph operation, not an image-tag operation. Promote the immutable subject and every required referrer, carry separate repository mappings, verify digest equality, and rerun the full trust policy at the destination. Only then does the mirror contain the evidence the deployment gate expects.
