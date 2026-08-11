# Where Does Cosign Store Container Image Signatures? OCI Referrers and Separate Repositories Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, OCI Referrers, Container Registry, Image Signing, Sigstore

Description: Understand how current Cosign stores signatures as OCI 1.1 referring artifacts, how legacy tag-based lookup differs, and when to use a separate signature repository.

---

A Cosign signature is not embedded in an image layer, and it is not part of the image manifest being signed. Changing the image manifest to insert a signature would change its digest and therefore change the subject. Instead, Cosign uploads a separate OCI object that refers to the subject manifest digest.

Current Cosign releases use the OCI 1.1 referrers model by default. Older Cosign releases and registries without native referrers support used a digest-derived tag convention. Knowing which model is in use explains many “signature missing” problems during mirroring, garbage collection, and repository migration.

## The subject remains immutable

Assume this is the signed image:

```text
registry.example.com/team/api@sha256:abcd...
```

The digest identifies an image manifest or image index. Cosign creates another manifest containing the signature and verification material, with an OCI `subject` descriptor that points back to `sha256:abcd...`. The registry stores both objects. The image's digest does not change.

OCI Distribution 1.1 defines a referrers API scoped to a repository and subject digest:

```text
GET /v2/team/api/referrers/sha256:abcd...
```

The response is an OCI image index containing descriptors for referring manifests. Signatures, attestations, and SBOM artifacts can all appear as referrers, distinguished by artifact type and media type.

“Stored alongside the image” therefore means in the same registry repository by default, not inside the image.

## Current OCI 1.1 storage

Cosign v3 made OCI Image 1.1 referring artifacts the default signature storage. A conceptual graph looks like this:

```text
image index or manifest: sha256:abcd...
  <- Cosign signature referrer: sha256:1111...
  <- provenance attestation:    sha256:2222...
  <- SBOM artifact:             sha256:3333...
```

Each attached object has its own digest and lifecycle. A normal image pull needs only the subject and its layers. A verifier discovers the relevant signature referrers and validates their payloads against the subject digest and trust policy.

Use an OCI-aware discovery tool to inspect the graph:

```bash
oras discover \
  registry.example.com/team/api@sha256:REPLACE_WITH_DIGEST
```

The ORAS `discover` command can show direct or recursive referrers and can select a specific distribution method when troubleshooting compatibility.

## Legacy digest-derived tags

Before standardized referrers support, Cosign located a signature object through a deterministic tag. A subject such as:

```text
registry.example.com/team/api@sha256:703218c0...
```

used a tag shaped like:

```text
registry.example.com/team/api:sha256-703218c0....sig
```

This convention made signatures usable on registries that supported ordinary image manifests and tags but did not understand artifact relationships. OCI Distribution 1.1 also specifies a referrers-tag fallback for registries that return `404` for the referrers API.

Do not assume a tag listing tells the whole story on a native-referrers registry, and do not assume a referrers API response finds artifacts created only under an incompatible legacy convention. Check the Cosign and registry versions when migrating.

## Store signatures in another repository

Cosign normally stores signatures in the same repository as the subject. Set `COSIGN_REPOSITORY` when registry permissions, retention rules, or organizational design require another location:

```bash
export COSIGN_REPOSITORY=registry.example.com/security/signatures

cosign sign --yes \
  registry.example.com/team/api@sha256:REPLACE_WITH_DIGEST
```

The verifier must use the same mapping:

```bash
export COSIGN_REPOSITORY=registry.example.com/security/signatures

cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  registry.example.com/team/api@sha256:REPLACE_WITH_DIGEST
```

A separate repository can centralize write access and keep signatures when application repositories have aggressive cleanup policies. It also creates an operational dependency: every signer, verifier, mirror job, and policy engine must agree on the mapping. Document it as part of the trust policy.

Repository syntax differs among registries. Sigstore's registry-support documentation notes, for example, that some registries require a full image-like path rather than a repository prefix. Test the exact target before rollout.

## Registry permissions are separate

Signing an image generally requires pull access to resolve the subject and push access for the signature object. Verification requires pull access to the subject and signature location. With a separate signature repository, grant those permissions independently.

Avoid giving runtime workloads signature-push permission. A typical split is:

- build job: push image, no signature permission;
- trusted signing job: pull subject and push signature artifacts;
- admission controller: pull subject and signatures only;
- mirror job: pull source graph and push destination graph;
- registry administrator: configure retention and garbage collection.

A registry may authenticate all these requests correctly while still lacking OCI 1.1 referrers behavior. Authentication success does not prove artifact-discovery compatibility.

## Retention and deletion need graph awareness

Because signatures are separate manifests, deleting a tag does not necessarily delete either the image manifest or its referrers. Conversely, garbage collection or replication that understands only tagged image roots can remove untagged referring artifacts.

Before enabling cleanup:

1. Confirm whether signatures use native referrers or a fallback tag.
2. Confirm how the registry marks referrers reachable.
3. Test deletion of a disposable signed image.
4. Verify whether signature and attestation artifacts remain or are intentionally removed.
5. Monitor for orphaned referrers and for subjects whose required signatures disappeared.

The OCI specification defines discovery and fallback behavior; registry-specific retention behavior still needs validation against that registry's official documentation.

## Mirroring is not automatic

A basic `docker pull`, `docker tag`, and `docker push` transfers the image, not the entire relationship graph. Even if the subject digest is identical at the destination, its referrers live in a different repository namespace and must be copied or recreated there.

Use a tool and mode that explicitly copies referrers, such as ORAS recursive copy where supported:

```bash
oras cp --recursive \
  source.example.com/team/api@sha256:SOURCE_DIGEST \
  mirror.example.net/team/api:release
```

Then discover and verify at the destination. Treat the final successful verification as the promotion gate.

## Storage troubleshooting checklist

- [ ] Record the subject's repository and digest.
- [ ] Check the Cosign major version and registry OCI 1.1 support.
- [ ] Use `oras discover` to inspect native or fallback referrers.
- [ ] Check for a configured `COSIGN_REPOSITORY` in both signing and verification environments.
- [ ] Confirm pull/push authorization separately for the image and signature repositories.
- [ ] Ensure mirror and backup tools copy the referrer graph, not only tags and layers.
- [ ] Test retention and garbage collection with disposable signatures and attestations.
- [ ] Verify the destination digest and trust policy after every promotion.

## Official Documentation

- [Sigstore registry support and `COSIGN_REPOSITORY`](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Cosign project storage guidance](https://github.com/sigstore/cosign)
- [OCI Distribution Specification referrers API and fallback](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [OCI Image Manifest `subject` field](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [ORAS `discover` command](https://oras.land/docs/commands/oras_discover/)
- [ORAS recursive copy command](https://oras.land/docs/commands/oras_cp/)

## Conclusion

Cosign stores a signature as a separate registry object associated with an immutable subject digest. Current releases use OCI 1.1 referrers, while legacy and fallback workflows may use digest-derived tags. Make that storage model, any separate signature repository, and the artifact graph explicit in permissions, retention, mirroring, and verification procedures.
