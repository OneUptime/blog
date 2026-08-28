# How to Size 64-Bit MMIO Space for Multi-GPU PCI Passthrough on ESXi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, GPU, PCI Passthrough, VMDirectPath I/O, MMIO

Description: Calculate a defensible 64-bit MMIO window for passthrough GPUs, configure it on a powered-off UEFI VM, and validate the result from ESXi power-on logs.

---

Large passthrough GPUs expose PCI base address registers (BARs) that must fit in the virtual machine's memory-mapped I/O address space. When the window is too small, the VM normally fails during power-on with messages such as `The firmware could not allocate ... PCI MMIO` or `total number of pages needed ... exceeds limit`.

The fix is not to increase guest RAM. Configure the VM for UEFI, enable 64-bit MMIO, and size a power-of-two MMIO region for the complete set of directly assigned devices. Confirm the value against the GPU and server vendors' supported configuration because framebuffer size is a planning proxy, not a substitute for device BAR specifications.

## Confirm That MMIO Is the Actual Failure

Power off the VM and inspect its `vmware.log` in the VM datastore directory:

```bash
grep -n -i -B 20 -A 40 \
  'pciMmioError\|PCI MMIO\|total number of pages needed' vmware.log
```

An allocation error at power-on is a sizing symptom. By contrast, a VM that runs and later powers off with `PCI passthru device ... caused an IOMMU fault` has experienced a rejected DMA transaction. Do not treat that runtime fault as proof that the MMIO window is too small.

Also confirm that:

- every GPU and related PCI function intended for this VM is listed;
- the host BIOS enables IOMMU and mapping above 4 GB as required by the server vendor;
- the platform, GPUs, firmware, ESXi release, guest OS, and driver are supported together;
- Resizable BAR has not been enabled in a way that conflicts with VMware's documented limitation for passthrough devices.

Broadcom's VMDirectPath I/O guidance states that Resizable BAR functionality is unsupported for PCI devices in passthrough mode.

## Inventory the Whole Device Set

List the devices assigned in **VM > Edit Settings** and capture their physical PCI addresses and models from the host. Include related functions and any NVLink or NVSwitch topology that the hardware vendor requires to remain together.

For each GPU, record:

- framebuffer or VRAM capacity;
- vendor-documented BAR1/BAR aperture requirements;
- whether additional functions are passed through;
- whether peer-to-peer DMA is part of the supported design.

Do not size from the number of GPUs alone. Four 16 GiB GPUs and four 80 GiB GPUs need very different address-space plans.

## Calculate the Initial Window

The general vSphere requirement is that `pciPassthru.64bitMMIOSizeGB` be a power-of-two number of GiB. Broadcom's GPU power-on troubleshooting KB uses the total GPU framebuffer memory and adds a conservative power-of-two margin:

1. Add the framebuffer memory of every GPU assigned to the VM.
2. If the total is exactly a power of two, choose the next power of two.
3. If the total lies between powers of two, round up to the next power and then advance one more power.

Examples from that method:

| Assigned GPUs | Total framebuffer | Initial MMIO setting |
| --- | ---: | ---: |
| 2 x 16 GiB | 32 GiB | 64 GiB |
| 2 x 24 GiB | 48 GiB | 128 GiB |
| 1 x 80 GiB | 80 GiB | 256 GiB |
| 8 x 16 GiB | 128 GiB | 256 GiB |

This deliberately leaves space for alignment and other BARs. Some product-specific Broadcom and GPU-vendor deployment guides instead provide an exact tested value for a particular platform. Use that supported value when it exists; do not blindly replace vendor guidance with the generic table.

For a new device generation, ask the GPU vendor for the required BAR aperture and the server vendor for the maximum supported MMIO map. A mathematically large window does not make an unsupported platform supported.

## Configure the Powered-Off VM

Changing VM firmware can make an operating system installed in legacy BIOS mode unbootable. Confirm the guest already supports UEFI, take an application-consistent backup, and have a recovery path before changing it.

In vSphere Client:

1. Power off the VM.
2. Open **Edit Settings > VM Options > Boot Options**.
3. Confirm **Firmware** is **EFI**.
4. Open **VM Options > Advanced > Edit Configuration**.
5. Add or update these parameters:

```text
pciPassthru.use64bitMMIO = TRUE
pciPassthru.64bitMMIOSizeGB = 256
```

Replace `256` with the power-of-two value validated for the assigned device set. Configuration parameters are normally edited as name/value fields; do not include the equals sign in the name.

Broadcom documents UEFI and 64-bit MMIO for passthrough configurations with more than the legacy below-4-GB BAR space. The host firmware must also permit PCI mapping above 4 GB.

## Keep Device-Specific Settings Separate

64-bit MMIO only creates address space. It does not enable every multi-GPU feature.

- Peer-to-peer DMA has separate VMDirectPath I/O requirements and advanced parameters on supported ESXi releases.
- Multi-function devices with reset dependencies may have to be assigned as a group.
- NVLink/NVSwitch designs can require all connected devices in the same VM and specific topology.
- Some vGPU profiles require additional device-indexed parameters that do not apply to direct passthrough generally.

Only apply those settings when the official VMware and hardware-vendor documentation for the exact design requires them.

## Validate Power-On and Guest Enumeration

Power on the VM and watch Recent Tasks. Then inspect the newest VM log:

```bash
grep -n -i \
  'PCIPassthru\|pciMmioError\|PCI MMIO\|DevicePowerOn' vmware.log
```

Validation has three layers:

1. **VM firmware:** no PCI MMIO allocation error appears during power-on.
2. **Guest enumeration:** every intended GPU and related function appears in the guest.
3. **Workload:** vendor diagnostics and a representative multi-GPU job complete without driver resets, PCIe errors, or IOMMU faults.

For NVIDIA guests, `nvidia-smi` can confirm enumeration and framebuffer capacity after the supported guest driver is installed. Use the equivalent vendor utility for other devices.

If the VM still reports insufficient MMIO, power it off and compare the configured value with the complete device set and the vendor's tested requirement. Increase only to another supported power-of-two value; do not keep doubling indefinitely. An unexpectedly large requirement can reveal an unsupported BAR mode, an omitted related function, or platform-firmware configuration that needs vendor review.

## Roll Back Safely

If the VM no longer boots after a firmware or MMIO change:

1. Keep it powered off.
2. Restore the previous advanced-parameter values.
3. Revert the firmware selection only if doing so matches the guest's installed boot mode.
4. Detach the passthrough devices temporarily if the application has a supported CPU-only recovery mode.
5. Review `vmware.log` before making another change.

Do not remove virtual disks, regenerate the VM, or clear the guest's EFI configuration as a first response to an MMIO allocation error.

## Official Documentation

- [Broadcom KB 312208: vSphere VMDirectPath I/O and Dynamic DirectPath I/O requirements](https://knowledge.broadcom.com/external/article/312208/vsphere-vmdirectpath-io-and-dynamic-dire.html)
- [Broadcom KB 334594: GPU passthrough power-on failure and MMIO sizing examples](https://knowledge.broadcom.com/external/article/334594/module-devicepoweron-power-on-failed-to.html)
- [Broadcom KB 323402: insufficient MMIO allocation for PCI passthrough](https://knowledge.broadcom.com/external/article/323402/failed-to-power-on-virtual-machines-with.html)
- [Broadcom KB 382439: multi-GPU MMIO sizing for a Tanzu workload cluster](https://knowledge.broadcom.com/external/article/382439/tkgm-adding-multiple-gpus-to-single-nod.html)
- [Broadcom Compatibility Guide](https://compatibilityguide.broadcom.com/)

## Conclusion

Size multi-GPU MMIO from the complete assigned device set, use a power-of-two window with the margin documented for the platform, and configure it only on a powered-off UEFI VM. The decisive test is a clean power-on followed by full guest enumeration and a representative workload-not merely a larger number in the VMX configuration.
