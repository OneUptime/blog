# Validation Summary: Fix Unsupported OCI Layer Media Types in CoCo Encrypted Images

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Confidential Containers (CoCo) guest-components and CDH image handling
- OCI image indexes, manifests, descriptors, and encrypted layer media types
- Skopeo image inspection, copying, compression normalization, and encryption
- CoCo keyprovider and KBS resource identifiers
- Kubernetes confidential sandboxes
- `jq` command-line JSON processing

## Sources Consulted
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [OCI Image Layer Filesystem Changeset Specification](https://github.com/opencontainers/image-spec/blob/main/layer.md)
- [CoCo encrypted layer handling at guest-components commit `eae0bf63`](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/decrypt.rs)
- [CoCo compression decoder at guest-components commit `eae0bf63`](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/decoder/mod.rs)
- [Skopeo copy command reference](https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-copy.1.md)
- [CoCo keyprovider usage at guest-components commit `eae0bf63`](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/coco_keyprovider/README.md)
- [OCIcrypt keyprovider configuration](https://github.com/containers/ocicrypt/blob/main/docs/keyprovider.md)

## Issues Found
No technical issues found.

## Review Notes
The claims about encrypted media-type support are intentionally tied to guest-components commit `eae0bf63`; deployments using another revision should inspect that revision's source. The Skopeo compression flags are version-dependent as the post notes, so checking the installed command's help remains appropriate.
