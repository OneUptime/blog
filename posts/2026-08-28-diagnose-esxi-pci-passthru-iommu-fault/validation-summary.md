# Validation Summary: How to Diagnose an ESXi VM That Powers Off with `PCI Passthru Device Caused IOMMU Fault`

## Status

validated

## Post Type

Troubleshooting guide / technical reference

## Technologies Covered

- VMware vSphere ESXi
- VMDirectPath I/O and direct PCI device assignment
- PCI passthrough and multi-function PCIe devices
- IOMMU DMA remapping and fault isolation
- PCIe Access Control Services and device reset methods
- UEFI VM firmware and 64-bit MMIO allocation
- SR-IOV and peer-to-peer DMA
- ESXi `vmware.log` and `vmkernel.log` diagnostics
- ESXi Shell tools: `vim-cmd`, `lspci`, `grep`, and `vm-support`
- Server, device-firmware, guest-driver, and compatibility validation

## Sources Consulted

- [Broadcom KB 392714: Error "PCI passthru device caused IOMMU fault" when VM Powers Off Unexpectedly](https://knowledge.broadcom.com/external/article/392714/error-pci-passthru-device-caused-iommu-f.html)
- [Broadcom KB 312208: vSphere VMDirectPath I/O and Dynamic DirectPath I/O requirements](https://knowledge.broadcom.com/external/article/312208/vsphere-vmdirectpath-io-and-dynamic-dire.html)
- [Broadcom KB 334594: PCI passthrough GPU power-on failure caused by insufficient MMIO](https://knowledge.broadcom.com/external/article/334594/module-devicepoweron-power-on-failed-to.html)
- [Broadcom Compatibility Guide](https://compatibilityguide.broadcom.com/)
- [Broadcom KB 339691: Determining why a virtual machine was unexpectedly powered off, restarted, or rebooted](https://knowledge.broadcom.com/external/article/339691/determining-why-a-vm-was-poweredoff-or-r.html)
- [Broadcom KB 316550: Locating virtual machine log files on an ESXi host](https://knowledge.broadcom.com/external/article/316550/locating-virtual-machine-log-files-on-an.html)
- [Broadcom KB 306962: Location and contents of ESXi log files](https://knowledge.broadcom.com/external/article/306962/location-of-esxi-log-files.html)
- [Broadcom KB 313542: Collecting ESX/ESXi diagnostic information with `vm-support`](https://knowledge.broadcom.com/external/article/313542/collecting-diagnostic-information-for-vm.html)
- [Broadcom KB 319493: Collecting ESXi diagnostic information with the vSphere Client](https://knowledge.broadcom.com/external/article/319493/collecting-diagnostic-information-for-vm.html)
- [Broadcom KB 373820: Identifying passthrough PCI devices with `lspci`](https://knowledge.broadcom.com/external/article/373820)
- [Broadcom KB 449114: Guest virtual-IOMMU conflict with passthrough devices that use RMRRs](https://knowledge.broadcom.com/external/article/449114/error-cant-use-virtual-iommu-with-device.html)
- [Intel documentation: Intel VT-d objectives, DMA remapping, and isolation](https://edc.intel.com/content/www/us/en/design/products-and-solutions/processors-and-chipsets/core-ultra-200h-and-200u-series-processors-datasheet-volume-1-of-2/intel-virtualization-technology-intel-vt-for-directed-i-o-intel-vt-d/)
- [BusyBox `grep` command reference](https://busybox.net/downloads/BusyBox.html)

## Issues Found

- The opening attributed guest/host isolation to the VM shutdown. Broadcom documents the IOMMU as detecting and blocking the invalid memory operation, while the VMX fault is unrecoverable and terminates the VM. Reworded the paragraph so the IOMMU block, rather than the shutdown, is correctly identified as the isolation mechanism.
- The instruction not to disable "IOMMU" was ambiguous because ESXi distinguishes the required host/platform IOMMU from a guest virtual IOMMU, which Broadcom requires disabling for some unsupported RMRR combinations. Clarified that the warning applies to the host/platform IOMMU.
- The vSphere Client path for locating the VM files was not the current documented workflow. Replaced it with **Summary > Edit Settings > VM Options > General > Virtual Machine Working Location** and clarified that `vim-cmd vmsvc/getallvms` returns the `.vmx` path, whose parent directory normally contains `vmware.log`.
- The MMIO paragraph described `pciPassthru.use64bitMMIO` as a setting that is sized. It is a Boolean enable switch; `pciPassthru.64bitMMIOSizeGB` controls the region size. Corrected the parameter names and roles and specified UEFI VM firmware.
- The log-correlation guidance could be read as asking for PCIe AER events in the guest. Broadcom states that PCI errors for a VMDirectPath function are handled by ESXi and are not presented to the guest. Assigned guest-driver resets and timeouts to guest logs, PCIe errors to `vmkernel.log` or platform logs, and retained `vmware.log` for VMX-side context.
- The support-bundle paragraph instructed readers to copy the bundle before leaving maintenance mode even though the procedure neither enters nor requires maintenance mode. Removed that unrelated condition.
- The support paragraph said a DMA transaction could originate from the driver or application. The PCI function emits the transaction; hardware, firmware, or software that programs the device can cause the invalid DMA. Reworded the causal explanation accordingly.

## Review Notes

- The ESXi commands and flags are valid: `vim-cmd vmsvc/getallvms` lists registered VMs and configuration paths, `lspci` identifies the SBDF and device, the `grep` expressions and context flags are supported by the ESXi shell toolset, and `vm-support` generates a host support bundle.
- `/var/run/log/vmkernel.log` is a current documented ESXi log path. By default, `vmware.log` is stored with the VM configuration and rotates to numbered archives.
- The post correctly keeps the numeric IOMMU fault type as evidence rather than assigning it a platform-independent interpretation.
- The distinction between a runtime IOMMU fault and a power-on MMIO/BAR allocation failure is correct. Enabling and sizing 64-bit MMIO is not a generic remedy for a runtime DMA-remapping fault.
- The requirements for a platform IOMMU, upstream PCIe ACS, supported reset behavior, collective assignment of reset-dependent functions, and vendor-supported firmware/driver combinations agree with Broadcom's VMDirectPath guidance.
- All external links in the post resolve to the intended resources. vSphere Client and ESXi Host Client labels can vary by release, so the command-line path lookup remains a useful fallback.
