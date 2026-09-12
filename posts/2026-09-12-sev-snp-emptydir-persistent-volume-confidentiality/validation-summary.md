# Validation Summary: Which emptyDir and Persistent Volume Data Is Confidential in SNP Pods?

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- AMD SEV-SNP
- Confidential Containers (CoCo)
- Kata Containers
- Kubernetes `emptyDir`, PersistentVolumes, and PersistentVolumeClaims
- LUKS2, dm-crypt, and storage integrity protection
- Guest-managed and application-level encryption

## Sources Consulted

- [Confidential Containers: Protected Storage](https://confidentialcontainers.org/docs/features/protected-storage/)
- [Confidential Containers: Confidential EmptyDir](https://confidentialcontainers.org/docs/features/protected-storage/confidential-emptydir/)
- [Confidential Containers: Confidential Container Image Storage](https://confidentialcontainers.org/docs/features/protected-storage/confidential-image-storage/)
- [Kubernetes: Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kata Containers: Limitations](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/Limitations.md)
- [Kata Containers: QEMU runtime configuration](https://github.com/kata-containers/kata-containers/blob/main/src/runtime/config/configuration-qemu.toml.in)
- [AMD: SEV Secure Nested Paging Firmware ABI Specification](https://www.amd.com/content/dam/amd/en/documents/developer/56860.pdf)

## Issues Found
No technical issues found.

## Review Notes
The confidential `emptyDir` behavior is runtime- and configuration-dependent. The post correctly tells readers to verify the selected confidential RuntimeClass, Kata version, volume implementation, and effective guest mapper setup. The Kubernetes snippets are valid fragments but intentionally omit the surrounding Pod manifest and RuntimeClass selection, which the text explicitly acknowledges. The experimental status and ephemeral workload semantics of `/dev/trusted_store` are accurately described.
