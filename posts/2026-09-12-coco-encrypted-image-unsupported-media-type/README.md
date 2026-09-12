# Fix Unsupported OCI Layer Media Types in CoCo Encrypted Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, OCI, Encryption, Kubernetes, Troubleshooting

Description: Diagnose encrypted image media-type failures by checking platform manifests, OCI encryption descriptors, gzip normalization, and CDH support.

---

An encrypted image can be valid in an OCI registry and still use a layer format that the deployed CoCo guest cannot decode. When CDH reports an unsupported media type, changing KBS policy is unlikely to help until the actual layer descriptor is understood.

The important distinction is between an image index, an image manifest, and a layer media type. Encryption adds another distinction: support for ordinary zstd layers does not necessarily imply support for encrypted zstd layers.

## Inspect the Exact Platform Manifest

Record the guest architecture and image digest. First download the raw registry object:

```bash
REPOSITORY=registry.example.com/team/app
REFERENCE="$REPOSITORY:encrypted"
skopeo inspect --raw "docker://$REFERENCE" > top-level.json
jq '{mediaType, manifests, layers}' top-level.json
```

If the object contains `manifests`, it is an index or manifest list. Inspect the platform entries and retrieve the relevant child rather than expecting top-level layers:

```bash
jq -r '.manifests[] | [.platform.os, .platform.architecture, .digest] | @tsv' \
  top-level.json
DIGEST=$(jq -er '.manifests[] |
  select(.platform.os == "linux" and .platform.architecture == "amd64") |
  .digest' top-level.json)
skopeo inspect --raw "docker://$REPOSITORY@$DIGEST" > manifest.json
```

This example assumes one matching Linux amd64 entry. If multiple entries match, select the intended variant explicitly before continuing. If the original object already had layers, copy it to `manifest.json` instead. [OCI image index](https://github.com/opencontainers/image-spec/blob/main/image-index.md)

List every layer, not just the first:

```bash
jq -r '.layers[] | [.mediaType, .digest, (.size | tostring)] | @tsv' \
  manifest.json
```

A partially encrypted image may contain both encrypted and unencrypted descriptors. A successful first layer says little about the remainder.

## Compare the Deployed Decoder with the Descriptor

In guest-components commit `eae0bf63`, the encryption path recognizes encrypted OCI tar and gzip layer types, including their nondistributable variants. The ordinary decoder also recognizes zstd, but that does not add an encrypted zstd branch to the decryptor. Check the source corresponding to the guest image actually installed. [CoCo decryptor](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/decrypt.rs), [CoCo decoder](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/decoder/mod.rs)

Examples worth distinguishing:

| Descriptor | Interpretation |
|---|---|
| `application/vnd.oci.image.layer.v1.tar+gzip` | Ordinary gzip-compressed OCI layer |
| `application/vnd.oci.image.layer.v1.tar+gzip+encrypted` | Encrypted gzip OCI layer |
| `application/vnd.oci.image.layer.v1.tar+zstd` | Ordinary zstd layer |
| A zstd descriptor with an encryption suffix | Requires explicit encrypted-format support |

Also identify which component emitted the error. A host snapshotter rejecting metadata is different from CDH rejecting a layer in the guest. Capture the literal string and component version; the phrase “media type not supported” alone is insufficient.

## Normalize Plaintext Before Encrypting

Use a trusted build environment to normalize the original plaintext image. Do not decrypt production layers on the untrusted Kubernetes host as a troubleshooting shortcut.

For a Skopeo version providing the documented compression options, a conservative compatibility path is OCI plus gzip:

```bash
# Run in the trusted image build environment.
skopeo --override-os linux --override-arch amd64 copy \
  --format oci \
  --dest-compress-format gzip \
  --dest-force-compress-format \
  docker://registry.example.com/team/app:plaintext \
  oci:normalized-app:plain
```

Check `skopeo copy --help` before using these options on an older installation. `--format oci` selects the manifest representation; the compression options govern layer compression. They solve different parts of the compatibility problem. [Skopeo copy reference](https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-copy.1.md)

Encrypt the normalized image with the CoCo keyprovider configured according to the official procedure. For example, once that provider is reachable and its configuration is loaded:

```bash
skopeo copy \
  --encryption-key "provider:attestation-agent:keypath=/secure/image-key::keyid=kbs:///default/image-key/app::algorithm=A256GCM" \
  oci:normalized-app:plain \
  oci:encrypted-app:encrypted
```

The key path is in the keyprovider's execution environment. If the provider runs in a container, mount the key where that process can read it. Keep the existing image trust policy enabled and provision the same key bytes to the referenced KBS resource. [CoCo keyprovider](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/coco_keyprovider/README.md)

Inspect the new encrypted manifest before pushing it. Confirm that all intended layers use supported encrypted media types and carry the keyprovider annotations. Then push under a new tag and inspect the object returned by the destination registry.

## Do Not Repair Media Types by Editing JSON

Changing a descriptor from zstd to gzip does not recompress the blob. Removing `+encrypted` does not decrypt it. Those edits can make a client feed ciphertext or the wrong compression stream to an unpacker.

Rebuilding or recompressing changes content digests. Update references, signatures, and policy inputs for the resulting artifact through the normal release process. Preserve the old digest as a comparison point so that a cache hit cannot masquerade as a successful format correction.

## Validate the Next Dependency

Retest the new digest in a fresh confidential sandbox. If the unsupported-media error disappears and a KBS error appears, that is useful progress: the image has reached the key-retrieval stage. Trace attestation, resource authorization, and key matching separately at that point.

Use a minimal image as the first reproduction and then the application image. This isolates format compatibility from large-image timeouts and storage pressure. Record the encryption tool version, guest-components version, selected platform manifest, and observed layer types with the result.

## Conclusion

Fix encrypted-image format failures by inspecting the platform's real layer descriptors and comparing them with the deployed decryptor. Normalize plaintext to a supported OCI compression format, encrypt it again in a trusted environment, and verify the new digest through the guest pull path.

## Official Documentation

- [OCI image index specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [CoCo encrypted layer handling](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/decrypt.rs)
- [CoCo compression decoder](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/decoder/mod.rs)
- [Skopeo copy options](https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-copy.1.md)
- [CoCo keyprovider usage](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/coco_keyprovider/README.md)
