# Validation Summary: How to Size 64-Bit MMIO Space for Multi-GPU PCI Passthrough on ESXi

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- VMware vSphere and ESXi
- VMDirectPath I/O PCI passthrough
- 64-bit PCI MMIO and PCI BAR/BAR1 sizing
- Multi-GPU passthrough
- UEFI firmware, IOMMU, and above-4-GB PCI mapping
- NVIDIA `nvidia-smi`, NVLink, and NVSwitch
- Resizable BAR and peer-to-peer DMA considerations

## Sources Consulted

- [Broadcom KB 312208: vSphere VMDirectPath I/O and Dynamic DirectPath I/O requirements](https://knowledge.broadcom.com/external/article/312208/vsphere-vmdirectpath-io-and-dynamic-dire.html)
- [Broadcom KB 334594: GPU passthrough power-on failure and MMIO sizing examples](https://knowledge.broadcom.com/external/article/334594/module-devicepoweron-power-on-failed-to.html)
- [Broadcom KB 323402: insufficient MMIO allocation for PCI passthrough](https://knowledge.broadcom.com/external/article/323402/failed-to-power-on-virtual-machines-with.html)
- [Broadcom KB 382439: multi-GPU MMIO sizing for a Tanzu workload cluster](https://knowledge.broadcom.com/external/article/382439/tkgm-adding-multiple-gpus-to-single-nod.html)
- [Broadcom KB 392714: PCI passthrough device IOMMU faults](https://knowledge.broadcom.com/external/article/392714/error-pci-passthru-device-caused-iommu-f.html)
- [Broadcom KB 391724: NVSwitch and NVLink passthrough requirements](https://knowledge.broadcom.com/external/article/391724)
- [Broadcom Compatibility Guide](https://compatibilityguide.broadcom.com/)
- [NVIDIA Virtual GPU Software: validated VMware vSphere platforms and large-MMIO passthrough requirements](https://docs.nvidia.com/vgpu/latest/grid-vgpu-release-notes-vmware-vsphere/validated-platforms.html)
- [NVIDIA Virtual GPU Software: using GPU pass-through](https://docs.nvidia.com/vgpu/latest/grid-vgpu-user-guide/using-gpu-pass-through.html)
- [NVIDIA System Management Interface documentation](https://docs.nvidia.com/deploy/nvidia-smi/index.html)

## Issues Found
No technical issues found.

## Review Notes

- The two VM configuration keys, EFI requirement, power-of-two sizing rule, conservative framebuffer calculation, example values, and power-on error strings match Broadcom's current guidance.
- The post correctly treats framebuffer capacity as a conservative planning proxy and directs readers to use an exact vendor-documented BAR1 requirement when one is available.
- The distinction between a power-on MMIO allocation failure and a runtime IOMMU fault is accurate.
- NVIDIA's current large-MMIO passthrough guidance also explicitly requires a 64-bit guest OS. The post's instruction to verify the supported guest/platform combination covers this at a high level, but this prerequisite could be made explicit in a future expansion.
- Peer-to-peer DMA support begins with ESXi 7.0 U2 under Broadcom's documented requirements, and NVLink/NVSwitch assignment rules remain topology- and release-specific. The post correctly avoids prescribing those settings generically.
