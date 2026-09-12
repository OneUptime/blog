# Validation Summary: Debug GPU Passthrough to SNP Pods: IOMMU, VFIO, and vsock

## Status
validated

## Post Type
Troubleshooting guide / runbook

## Technologies Covered
- AMD SEV-SNP
- NVIDIA Confidential Computing GPUs
- Confidential Containers and Trustee attestation
- Kata Containers and QEMU
- Kubernetes and containerd
- Linux IOMMU, PCI, VFIO, and vsock
- NVIDIA GPU Operator, CC Manager, and VFIO Manager

## Sources Consulted
- [NVIDIA Confidential Containers supported platforms and software components](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/supported-platforms.html)
- [NVIDIA Confidential Containers prerequisites](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/prerequisites.html)
- [NVIDIA Confidential Containers reference architecture](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/overview.html)
- [NVIDIA Confidential Containers detailed install guide](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/confidential-containers-deploy.html)
- [NVIDIA configuring Confidential Container workloads](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/configure-workloads.html)
- [NVIDIA Confidential Containers troubleshooting](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/troubleshooting.html)
- [Linux kernel VFIO documentation](https://docs.kernel.org/driver-api/vfio.html)
- [Confidential Containers NVIDIA GPU examples](https://confidentialcontainers.org/docs/examples/nvidia-gpu-examples/)
- [Trustee attestation architecture](https://confidentialcontainers.org/docs/attestation/architecture/)
- [Trustee attestation service policies](https://confidentialcontainers.org/docs/attestation/policies/)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly treats the NVIDIA support matrix as version-specific and directs readers to validate the complete hardware and software combination instead of presenting a fixed matrix that could become stale.
- `nvidia.com/pgpu` is the current default resource name; model-specific resource names can be configured, so readers should continue to use the resource advertised by their deployed release.
- The commands and YAML are syntactically valid. Environment placeholders such as `GPU_BDF`, `NODE_NAME`, and the example BDF are clearly identified for replacement.
