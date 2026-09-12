# Validation Summary: Trace CoCo Image Decryption Through Annotations and KBS Resources

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Confidential Containers (CoCo)
- OCI image manifests and encrypted layer annotations
- Trustee Key Broker Service (KBS) and Key Broker Client (KBC)
- Confidential Data Hub (CDH) configuration
- Remote attestation and resource authorization
- Skopeo, jq, Python, and shell utilities

## Sources Consulted
- [Confidential Containers: Encrypted Images](https://confidentialcontainers.org/docs/features/encrypted-images/)
- [CoCo keyprovider README at the pinned guest-components revision](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/coco_keyprovider/README.md)
- [ocicrypt-rs annotation processing at the pinned guest-components revision](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/ocicrypt-rs/src/encryption.rs)
- [CDH example configuration at the pinned guest-components revision](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)
- [Skopeo inspect command documentation](https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [Python `base64` documentation](https://docs.python.org/3/library/base64.html)

## Issues Found
No technical issues found.

## Review Notes
The guest-components links are intentionally pinned to a specific commit, which makes the annotation format, comma-separated processing, KBS URI caveat, 32-byte KEK requirement, and CDH field names reproducible. Operational details can vary with the deployed CoCo and Trustee versions, so retaining the post's advice to compare deployed component versions is appropriate.
