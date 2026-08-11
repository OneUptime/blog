# How to Sign and Verify Multi-Architecture Container Images with Cosign

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Multi-Architecture, OCI Image Index, Image Signing, Container Security

Description: Sign and verify multi-platform image indexes and their architecture-specific manifests without confusing their distinct OCI digests.

---

A multi-architecture image is usually an OCI image index—not one runnable image manifest. The index has its own digest and contains descriptors for platform-specific child manifests such as `linux/amd64` and `linux/arm64`. Each child also has its own digest.

Cosign can sign the index, each child, or both. The correct choice depends on what your verifier consumes. A signature on the index protects the selected set of platform descriptors. It is not automatically a separate signature on every child manifest.

## Inspect the object before signing

Build and push the multi-platform image with an approved builder. Capture the index digest from the build output. For an operator check, inspect the remote reference:

```bash
IMAGE=registry.example.com/team/api
TAG=1.8.0
INDEX_DIGEST=$(crane digest "$IMAGE:$TAG")
INDEX="$IMAGE@$INDEX_DIGEST"

crane manifest "$INDEX" | jq '{mediaType, manifests}'
```

An OCI index uses media type `application/vnd.oci.image.index.v1+json`. Docker's compatible manifest-list media type may also appear. The `manifests` array contains descriptors with a digest and platform fields.

Record the full index reference. Do not sign `:1.8.0` after another job can move that tag.

## Option 1: sign only the index

If consumers always resolve the signed index and select a child through it, sign the index digest:

```bash
cosign sign --yes "$INDEX"
```

Keyless verification names the authorized identity and issuer:

```bash
cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$INDEX"
```

This establishes that the trusted signer authorized the exact index. Because every child descriptor, including its digest and platform metadata, is part of the index bytes, changing the child list changes the index digest and invalidates that binding.

Index-only signing is often sufficient when admission policy verifies the exact index digest used in deployment. It is insufficient when a downstream system pulls, mirrors, or distributes a child manifest independently and expects a signature directly attached to that child.

## Option 2: sign the index and all children

Cosign's signing command documents `--recursive` for a multi-architecture digest:

```bash
cosign sign --yes --recursive "$INDEX"
```

For key-based signing, provide the approved key URI or file:

```bash
cosign sign \
  --key awskms:///alias/container-release \
  --recursive \
  "$INDEX"
```

The recursive operation signs the index and additionally signs the discrete images it references. Confirm the exact behavior with the pinned Cosign version used by CI; command behavior and registry representation are versioned dependencies.

Concurrent signing processes can create operational races in legacy storage formats. Make one trusted release job responsible for signing a given subject graph, or otherwise serialize writes and verify the final result.

## Verify every required subject

The current `cosign verify` command does not advertise a recursive verification flag. Verify the index, enumerate child digests from the immutable index, and verify each child explicitly:

```bash
set -euo pipefail

verify_subject() {
  cosign verify \
    --certificate-identity="$EXPECTED_IDENTITY" \
    --certificate-oidc-issuer="$EXPECTED_ISSUER" \
    "$1" >/dev/null
}

verify_subject "$INDEX"

crane manifest "$INDEX" \
  | jq -r '.manifests[].digest' \
  | while read -r digest; do
      verify_subject "$IMAGE@$digest"
    done
```

`set -o pipefail` prevents a later pipeline command from hiding a failed verifier. Do not verify a child list obtained from a mutable tag after verifying the index; read it from the verified index digest.

If policy requires only selected platforms, filter descriptors explicitly and fail on unexpected duplicates or missing platforms:

```bash
AMD64_DIGEST=$(
  crane manifest "$INDEX" \
    | jq -er '.manifests[]
      | select(.platform.os == "linux" and .platform.architecture == "amd64")
      | .digest'
)

verify_subject "$IMAGE@$AMD64_DIGEST"
```

Use `jq -e` and validate that exactly one descriptor matched. A string-selection script that returns no digest should fail closed.

## Avoid signing a local platform by accident

A multi-platform tag can be reduced to one architecture when it passes through a local daemon or a copy command with a platform selector. For example, pulling into a single-platform Docker daemon and then pushing a new image does not necessarily preserve the original index.

Before signing, assert the media type and expected platform set from the remote manifest. After mirroring, compare the source and destination index digests. A different digest means the existing index signature should not verify.

Use registry-to-registry tools that copy the complete index. ORAS documents that copying an image index copies all of its manifests. If signatures and attestations also need promotion, use its recursive referrer-copy option and validate the destination graph.

## Decide where attestations and SBOMs attach

Build provenance may describe the build that produced the whole index, while an SBOM frequently differs by architecture because package contents differ. Attach each statement to the subject it actually describes:

- index signature: authorizes the multi-platform release set;
- child signature: authorizes one runnable platform manifest independently;
- index provenance: describes a build/publish operation covering the index, if the predicate subjects say so;
- child SBOM: inventories packages for one platform manifest;
- index-level SBOM: valid only if it genuinely represents the complete index and its platform-specific contents.

An artifact stored next to an index is not automatically about every child. The in-toto statement's `subject` and predicate semantics must match the verification policy.

## Kubernetes considerations

Kubernetes accepts an image reference by tag or digest. The container runtime resolves an index and selects a platform appropriate for the node. If admission verifies only the index but a later mirror replaces it with a platform image, the deployment no longer has the same subject.

Choose and document one model:

1. **Index trust:** manifests pin the index digest; admission verifies it; runtimes select children from that exact index.
2. **Child trust:** manifests are rendered with architecture-specific child digests; admission verifies each child.
3. **Both:** release signs index and children, and separate gates validate each level where it is consumed.

The third model provides flexibility but creates more signatures and policy work. Do not require it without a concrete distribution need.

## Multi-architecture signing checklist

- [ ] Capture the index digest directly from the push operation.
- [ ] Confirm the remote object is an index and record its platform descriptors.
- [ ] Decide whether policy trusts the index, children, or both.
- [ ] Use `cosign sign --recursive` only when child signatures are required.
- [ ] Verify the index by digest with an exact key or keyless identity policy.
- [ ] Enumerate children from that verified index and verify required child digests.
- [ ] Attach SBOMs and attestations to the subjects they actually describe.
- [ ] Copy the full index and referrer graph during registry promotion.
- [ ] Compare source and destination index digests after mirroring.
- [ ] Test on every supported platform before enforcement.

## Official Documentation

- [Cosign signing command, including `--recursive`](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md)
- [Cosign verification command reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [ORAS copy command](https://oras.land/docs/commands/oras_cp/)
- [Kubernetes image documentation](https://kubernetes.io/docs/concepts/containers/images/)

## Conclusion

Multi-architecture signing begins by distinguishing the index digest from its child-manifest digests. Sign the index when the release set is the trust subject, add recursive child signatures when consumers need independent platform trust, and verify every subject your policy requires. Keeping those identities explicit prevents a valid signature at one level from being misapplied to another.
