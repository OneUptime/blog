# Validation Summary: How to Enable ESXi PCI Passthrough and Fix Devices Stuck at `Needs Reboot`

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- VMware vSphere and ESXi 7.0/8.0
- VMDirectPath I/O (DirectPath I/O / PCI passthrough)
- PCI Express, PCI functions, BARs, and 64-bit MMIO
- IOMMU, Intel VT-d, AMD IOMMU/AMD-Vi, and PCIe ACS
- ESXCLI, LocalCLI, and ConfigStoreCLI
- GPU, NIC, storage-controller, and SR-IOV device troubleshooting
- vSphere Client and ESXi host logging

## Sources Consulted

- [Configuring VMDirectPath I/O pass-through devices on a VMware ESX or VMware ESXi host (Broadcom KB 309986)](https://knowledge.broadcom.com/external/article/309986)
- [vSphere VMDirectPath I/O and Dynamic DirectPath I/O: Requirements for Platforms and Devices (Broadcom KB 312208)](https://knowledge.broadcom.com/external/article/312208)
- [GPU shows Shared Direct or Basic and will not enter passthrough on ESXi (Broadcom KB 445893)](https://knowledge.broadcom.com/external/article/445893)
- [PCIe devices are reported as non-pass-through capable or SR-IOV fails to enable (Broadcom KB 391460)](https://knowledge.broadcom.com/external/article/391460)
- [Virtual machines might not power on when configured with PCI passthrough devices in ESXi 8.0 (Broadcom KB 409712)](https://knowledge.broadcom.com/external/article/409712)
- [Confirming ESX/ESXi host hardware (System, Storage, and I/O) compatibility (Broadcom KB 313743)](https://knowledge.broadcom.com/external/article/313743)
- [Bootbank pointing to /tmp due to storage adapter/device being marked as passthrough device (Broadcom KB 373820)](https://knowledge.broadcom.com/external/article/373820)
- [Virtual machine snapshot fails when a PCI passthrough device is present (Broadcom KB 428701)](https://knowledge.broadcom.com/external/article/428701)
- [ESXCLI hardware command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_hardware.html)
- [esxcli hardware pci list command returns VMKernel Name as empty (Broadcom KB 377660)](https://knowledge.broadcom.com/external/article/377660)
- [VM fails to power on when IOMMU support is not enabled (Broadcom KB 407601)](https://knowledge.broadcom.com/external/article/407601)
- [Build numbers and versions of VMware ESXi/ESX (Broadcom KB 316595)](https://knowledge.broadcom.com/external/article/316595)

## Issues Found

- The snapshot limitation was categorical. Broadcom's current ESXi 8.0 guidance permits a snapshot while the VM is powered off even if the passthrough device remains attached, so the post now states that snapshots are unavailable while the VM is powered on.
- The prerequisite to install “ESXi drivers” could imply that the passthrough function needs a vendor VMkernel driver. It now calls for a supported ESXi image and host-driver combination while retaining the separate requirement for an OEM-supported in-guest driver.
- The reset-dependency paragraph combined two different rules. It now states that a bus-level reset requires all PCI functions on that bus to be assigned to the same VM, while functionally dependent functions of a multi-function device must also be assigned together.
- The boot-controller warning overstated the linked KB as a total boot failure. It now describes the documented condition: the boot device can become unavailable to ESXi after startup, causing configuration changes to be written only to temporary storage.
- The ConfigStore repair is documented by Broadcom for matching ESXi 7.0 and 8.0 hosts, so that scope is now explicit. The procedure also now covers individually deleting confirmed stale SR-IOV virtual-function records for the same device, as required by the KB, without broadening the delete.
- The hotplug-reset fix wording now identifies ESXi 8.0 Update 3g or a later Update 3 patch, avoiding ambiguity with separately maintained older ESXi 8.0 update branches.
- Two official-document link labels were stale or misleading. They were updated to the current Broadcom titles; the article IDs and URLs were already correct.

## Review Notes

All shell commands and options were matched against Broadcom's current ESXCLI reference or the exact remediation KB. In particular, omitting `--apply-now` from `esxcli hardware pci pcipassthru set` correctly defers the ownership change until the documented reboot. The `configstorecli` component, group, key, item addressing, deletion sequence, two-reboot workflow, ownership fields, and `/var/run/log/vmkernel.log` path are correct.

Broadcom KB 391460 still documents `VMkernel.Boot.disableACSCheck=TRUE` for the ESXi 8.0.3 ACS sanity-check regression without naming a fixed build, so the post correctly tells readers to confirm the live KB before using it. Broadcom KB 409712 identifies ESXi 8.0 Update 3g (`80P06`, build 24859861) as the first release containing the hotplug-reset fix.

The ConfigStore deletion is intentionally limited to hosts that match Broadcom KB 445893. It should not be generalized to other ownership or reboot symptoms, and `--all` must not be used for this repair.
