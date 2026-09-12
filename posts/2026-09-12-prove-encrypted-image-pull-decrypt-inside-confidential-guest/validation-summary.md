# Validation Summary: Verify Encrypted Images Are Pulled and Decrypted Inside the Guest

## Status
validated

## Post Type
Security validation and troubleshooting guide

## Technologies Covered
- Confidential Containers (CoCo)
- Kata Containers guest image management
- Trustee Key Broker Service and Attestation Service
- Confidential Data Hub and Attestation Agent
- OCI image encryption, manifests, and image indexes
- Skopeo
- jq
- Kubernetes and kubectl
- Confidential container image storage

## Sources Consulted
- [Confidential Containers architecture](https://github.com/confidential-containers/confidential-containers/blob/main/architecture.md)
- [Kata Containers guest image management design](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/design/kata-guest-image-management-design.md)
- [Confidential Containers encrypted images](https://confidentialcontainers.org/docs/features/encrypted-images/)
- [Confidential Containers signed images](https://confidentialcontainers.org/docs/features/signed-images/)
- [Confidential Containers confidential image storage](https://confidentialcontainers.org/docs/features/protected-storage/confidential-image-storage/)
- [Trustee KBS attestation protocol](https://github.com/confidential-containers/trustee/blob/main/kbs/docs/kbs_attestation_protocol.md)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [Skopeo inspect documentation](https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-inspect.1.md)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found
No technical issues found.

## Review Notes
The post correctly treats host inspection as supporting operational evidence rather than proof against a malicious host. The guest-pull implementation and its diagnostics are release-specific, as the post notes. The encrypted-image documentation currently requires Skopeo 1.13.3 or newer for its workflow, and confidential image storage remains documented as experimental, ephemeral, and without replay protection.
