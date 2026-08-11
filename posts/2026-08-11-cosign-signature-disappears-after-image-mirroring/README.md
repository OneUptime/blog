# Why a Cosign Signature Disappears After Mirroring an Image to Another Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Container Registry, OCI Referrers, Image Mirroring, Supply Chain Security

Description: Diagnose missing Cosign signatures after registry mirroring by checking subject digests, referrer copying, legacy tag fallback, repository mapping, credentials, and retention.

---

An image mirror can preserve every layer and the image manifest while still omit its Cosign signature. The reason is structural: the signature is a separate OCI artifact that refers to the image's manifest digest. Copying the subject does not necessarily copy the objects that refer to it.

The signature did not become cryptographically invalid merely because the registry hostname changed. It is usually absent from the destination's artifact graph, stored in a separate repository, attached to a different digest, or undiscoverable through the destination registry's referrers implementation.

## Start with the two subject digests

Resolve the source and destination references:

```bash
SOURCE=source.example.com/team/api:1.8.0
DEST=mirror.example.net/team/api:1.8.0

SOURCE_DIGEST=$(crane digest "$SOURCE")
DEST_DIGEST=$(crane digest "$DEST")

printf 'source=%s\ndestination=%s\n' "$SOURCE_DIGEST" "$DEST_DIGEST"
```

If the digests differ, the destination is not the same subject. Common causes include selecting one platform instead of copying the multi-platform index, converting manifest media types, rebuilding, or mutating the image during import. A signature over the source digest must not verify a different destination digest.

If the digests match, continue. The content arrived; its referring artifacts may not have.

## Inspect the source artifact graph

Use OCI referrer discovery against the digest, not a mutable tag:

```bash
oras discover \
  "source.example.com/team/api@$SOURCE_DIGEST"
```

The result may include Cosign signatures, in-toto attestations, SBOM artifacts, and other metadata. Record their digests and artifact types.

Current Cosign uses OCI 1.1 referring artifacts. Older Cosign versions used digest-derived signature tags, and OCI Distribution 1.1 defines a referrers-tag fallback for registries without the native API. If discovery is empty but source verification succeeds, inspect the Cosign version, `COSIGN_REPOSITORY`, and fallback mode rather than concluding no signature exists.

## Why ordinary mirroring misses signatures

This familiar flow copies an image only:

```bash
docker pull "$SOURCE"
docker tag "$SOURCE" "$DEST"
docker push "$DEST"
```

Docker transfers the selected image manifest or index, configs, and layers. It does not promise to discover every OCI artifact whose `subject` points at the image and recreate that relationship in another registry.

The same caution applies to basic registry replication, pull-through caches, and tools advertised as “digest preserving.” Digest preservation is necessary but not sufficient. A complete promotion must preserve the subject and its required referrer graph.

## Copy the subject and referrers explicitly

ORAS documents recursive copying of an artifact and its referrers:

```bash
oras cp --recursive \
  "source.example.com/team/api@$SOURCE_DIGEST" \
  "mirror.example.net/team/api:1.8.0"
```

The `--recursive` option is documented as preview functionality, so pin and test the ORAS version used by the promotion pipeline. Both registries must support a compatible native referrers API or tag fallback. ORAS also provides `--from-distribution-spec` and `--to-distribution-spec` options when the endpoints require different mechanisms.

After copying, rediscover at the destination:

```bash
oras discover \
  "mirror.example.net/team/api@$DEST_DIGEST"
```

Compare required referrer counts, types, and digests. Finally, run Cosign verification against the destination reference and the real trust policy:

```bash
cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "mirror.example.net/team/api@$DEST_DIGEST"
```

Do not declare the mirror successful based only on a copy command's exit code.

## Check `COSIGN_REPOSITORY`

The source signer may have stored signatures outside the image repository:

```bash
export COSIGN_REPOSITORY=source.example.com/security/signatures
```

In that design, querying `source.example.com/team/api` alone cannot locate the signature. The destination verifier needs the corresponding destination mapping, and the promotion process must copy the separate signature repository intentionally.

Inspect the signing workflow and runtime environment. A locally successful verification with `COSIGN_REPOSITORY` set can mislead an operator whose admission controller does not have the same setting or repository option.

## Check registry compatibility and media handling

A registry can accept the image but reject, rewrite, or fail to index an attached artifact. Test these layers separately:

- Does `GET /v2/<name>/referrers/<digest>` work, or does the client need the OCI referrers-tag fallback?
- Does the destination accept the signature manifest and all media types?
- Are referrers required to live in the same repository as their subject?
- Did replication copy only tagged manifests?
- Did a proxy cache fetch the image lazily without fetching referrers?

The OCI Distribution Specification defines expected discovery and fallback behavior. Actual managed-registry replication and retention options are product-specific, so validate them against that registry's official documentation and a disposable signed artifact.

## Check authentication at every location

Verification may report “no signatures” when it was unable to list or pull them. Authenticate to the source image repository, source signature repository, destination image repository, and destination signature repository as applicable.

Prefer credential files or workload identity over putting passwords on a command line. Confirm that the verifier has `pull` permission for both subject and signature objects. A mirror service additionally needs source pull and destination push privileges for every manifest and blob in the graph.

Do not use `--allow-insecure-registry` to hide a TLS or authorization problem. Cosign documents it for testing; production should install the correct registry CA with `--registry-cacert` or the platform trust store.

## Watch garbage collection and retention

A signature can arrive and disappear later. Policies that retain only tagged images may regard native referrers as untagged manifests. Legacy digest-derived tags may be excluded by a rule that copies only semantic-version tags. Subject deletion can also leave or remove referrers depending on registry behavior.

Create a lifecycle test:

1. Push a disposable digest.
2. Attach a signature, attestation, and SBOM artifact.
3. Mirror recursively.
4. Verify and record the destination graph.
5. Run the real retention and garbage-collection jobs.
6. Discover and verify again.
7. Delete a tag without deleting the digest and repeat.

This tests the behavior that production actually depends on.

## Mirroring incident checklist

- [ ] Compare source and destination manifest or index digests.
- [ ] Determine whether the signature covers an index or a platform child manifest.
- [ ] Discover source referrers by digest and record their types.
- [ ] Check for `COSIGN_REPOSITORY` or a policy-engine repository override.
- [ ] Identify native OCI 1.1 versus legacy/fallback signature storage.
- [ ] Use a referrer-aware recursive copy operation.
- [ ] Authenticate to every source and destination repository in the graph.
- [ ] Discover destination referrers and compare them with the source.
- [ ] Verify the destination reference with exact identity and issuer constraints.
- [ ] Recheck after registry retention and garbage collection run.

## Official Documentation

- [Sigstore registry support and signature repository configuration](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [OCI Distribution Specification referrers and fallback behavior](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [OCI Image Manifest subject relationship](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [ORAS recursive `cp` documentation](https://oras.land/docs/commands/oras_cp/)
- [ORAS referrer discovery documentation](https://oras.land/docs/commands/oras_discover/)
- [Cosign verification command reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)

## Conclusion

When a mirrored image loses its apparent signature, first prove whether the subject digest stayed the same, then compare the source and destination referrer graphs. Make promotion copy signatures, attestations, and SBOMs explicitly, carry any separate-repository mapping, and finish with destination-side verification. An image-only mirror is not a supply-chain-metadata mirror.
