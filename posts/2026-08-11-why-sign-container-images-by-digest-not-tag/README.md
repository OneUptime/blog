# Why You Should Sign Container Images by Digest Instead of by Tag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Image Signing, OCI, Container Security, Supply Chain Security

Description: Learn why digest-pinned signing removes ambiguity from container-image trust and how to keep one immutable reference through build, signing, verification, and deployment.

---

A tag is a convenient name; a digest is a content identity. That distinction matters whenever a signature is supposed to authorize one exact container image. `registry.example.com/payments:1.8` can be moved to a different manifest, while `registry.example.com/payments@sha256:...` identifies bytes through the digest of their manifest.

Cosign signatures ultimately bind to a manifest digest even if you give `cosign sign` a tag. Cosign resolves the tag and signs the resolved digest. The problem is that a human, pipeline, or later verifier may resolve the same tag at a different time. Using a digest explicitly removes that timing-dependent ambiguity from the workflow.

## Tags and digests answer different questions

An OCI registry permits a manifest to have zero, one, or several tags. A tag is a human-readable pointer in a repository. Release automation may intentionally move `:stable`, `:production`, or `:latest` whenever a new version is promoted.

A digest is calculated from content. If a manifest changes, its digest changes. A digest reference therefore answers, “Which exact manifest?” A tag answers, “Which manifest does this name point to right now?”

Image signing needs the first answer. A deployment can still expose a friendly version label, but the security decision should be about the immutable digest.

## The race hidden in tag-based signing

Imagine two CI jobs operating on `app:release`:

1. Job A pushes manifest digest `sha256:aaa...` under the tag.
2. Job A starts `cosign sign registry.example.com/team/app:release`.
3. Job B updates `:release` to digest `sha256:bbb...`.
4. Job A or a later deployment resolves the tag again.

Depending on when each registry lookup occurs, the signer, verifier, and deployer may be talking about different manifests. A valid signature is not forged in this scenario; the workflow has simply failed to keep a stable subject.

Signing by digest makes the intended subject explicit:

```bash
IMAGE=registry.example.com/team/app
DIGEST=sha256:REPLACE_WITH_BUILD_OUTPUT
SUBJECT="$IMAGE@$DIGEST"

cosign sign --yes "$SUBJECT"
```

Do not discover the digest by pulling the mutable tag much later if the build system already returned a canonical digest. Capture the digest from the push operation and pass it as a typed output to downstream jobs.

## Keep the digest through verification and deployment

Use the same digest reference for verification:

```bash
cosign verify \
  --certificate-identity="https://github.com/example/payments/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  "$SUBJECT"
```

Then deploy that subject rather than resolving a tag yet again:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
spec:
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
        - name: payments
          image: registry.example.com/team/app@sha256:REPLACE_WITH_BUILD_OUTPUT
```

Kubernetes records the digest reference as supplied. Policy engines such as Kyverno can also resolve tags to digests, but receiving the digest directly from a trusted release pipeline is easier to audit and avoids an extra registry lookup during admission.

## Multi-platform images need a deliberate subject

A multi-platform tag normally points to an OCI image index. The index has its own digest and lists child manifests for platforms such as `linux/amd64` and `linux/arm64`. Signing the index digest says that the signed subject is the complete index descriptor and its current child list. It does not automatically create a separate signature for every child manifest.

That may be exactly the intended policy: consumers choose a platform from a signed index. If a verifier operates on individual platform manifests, sign those too with Cosign's documented `--recursive` behavior. In either case, record whether the policy trusts the index, the children, or both; do not treat those digests as interchangeable.

## A tag is still useful metadata

Digest pinning does not require abandoning tags. Tags remain valuable for browsing registries and finding releases. A common release flow is:

```bash
# Build and push a friendly tag. The builder returns the canonical digest.
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/team/app:1.8.0 \
  --push .

# Obtain the digest immediately from the builder's metadata in production.
# This command is useful for an operator check.
crane digest registry.example.com/team/app:1.8.0
```

Store both values in release metadata: the tag communicates version intent, while the digest is the security boundary. Before promotion, assert that the tag still resolves to the expected digest:

```bash
test "$(crane digest registry.example.com/team/app:1.8.0)" = "$DIGEST"
```

The assertion detects accidental tag movement, but it does not replace digest-pinned signing and deployment.

## Verification does not freeze a tag

A successful verification of `app:stable` means Cosign resolved the tag and found an acceptable signature for the digest it saw during that command. It does not prevent the tag from moving one second later. Nor does a signature give a mutable tag append-only semantics.

This is why “verify, then deploy the same tag” is weaker than “verify a digest, then deploy that digest.” The second flow carries the verified identifier across the trust boundary.

## Digest-first release checklist

- [ ] Capture the canonical manifest or index digest from the image push.
- [ ] Construct an `image@sha256:...` reference and treat it as immutable release data.
- [ ] Sign that exact reference, not a mutable tag.
- [ ] Verify the same digest with an explicit trusted key or keyless identity and issuer.
- [ ] Attach attestations and SBOM references to the same subject digest.
- [ ] Promote or mirror the digest together with its referrers.
- [ ] Put the verified digest in Kubernetes manifests or the final rendered GitOps output.
- [ ] Retain a friendly tag only as a discovery and release-management aid.
- [ ] For multi-platform images, document whether the index, child manifests, or both must be signed.

## Official Documentation

- [Cosign repository and digest-first signing guidance](https://github.com/sigstore/cosign)
- [Cosign signing command reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md)
- [OCI Distribution Specification definitions for tags and digests](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [Kubernetes documentation on image names and digests](https://kubernetes.io/docs/concepts/containers/images/)

## Conclusion

A tag can identify a release for people, but only a digest identifies immutable content for a signature policy. Capture the digest at build time, sign it, verify it, and deploy it without converting back to a tag. That simple discipline closes an avoidable race and makes every audit record point to the same container manifest.
