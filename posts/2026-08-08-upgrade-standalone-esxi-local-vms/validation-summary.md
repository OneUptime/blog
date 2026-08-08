# Validation Summary: Upgrade a Standalone ESXi Host When Every VM Is Stored Locally

## Status
validated

## Post Type
Technical Operations Guide

## Technologies Covered
- VMware ESXi and vSphere
- VMware Host Client and `vim-cmd`
- ESXCLI image-profile updates
- VMFS local datastores
- ESXi host-configuration bundles and bootbanks
- OEM-customized ESXi images, VIBs, and offline bundles
- Server storage controllers, RAID, NICs, HBAs, drivers, and firmware
- Virtual-machine snapshots, suspend state, backup, and inventory registration

## Sources Consulted
- [How to preserve VMFS datastore while upgrading or installing an ESXi host (Broadcom KB 392956)](https://knowledge.broadcom.com/external/article/392956/how-to-preserve-vmfs-datastore-while-upg.html) - installer choices and their effects on host settings and VMFS.
- [How to back up and restore the ESXi host configuration (Broadcom KB 313510)](https://knowledge.broadcom.com/external/article/313510/how-to-back-up-and-restore-the-esxi-host.html) - `vim-cmd` backup, restore, and maintenance-mode commands; build, UUID, and TPM restrictions; VM-inventory and bootbank exclusions.
- [Upgrade a Host with Offline Zip Bundle (Broadcom KB 343425)](https://knowledge.broadcom.com/external/article/343425/upgrade-a-host-with-offline-zip-bundle.html) - offline-depot profile discovery and update workflow.
- [Upgrading, updating, or applying a patch to ESXi using esxcli (Broadcom KB 390985)](https://knowledge.broadcom.com/external/article/390985/upgrading-updating-or-applying-a-patch-t.html) - maintenance mode, OEM bundles, profile selection, profile update, and reboot workflow.
- [ESXCLI software command reference, ESXi 8.0 Update 2](https://developer.broadcom.com/xapis/esxcli-command-reference/8.0.2/namespace/esxcli_software.html) - syntax and semantics for `software profile get`, `sources profile list`, `profile update`, `profile install`, `vib list`, and `--dry-run`.
- [ESXCLI storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html) - `storage filesystem list` and `storage core device partition list` syntax.
- [ESXi version changes are not allowed using esxcli software vib commands (Broadcom KB 380215)](https://knowledge.broadcom.com/external/article/380215) - ESXi 8.0 Update 2 and later restriction on VIB-based host updating.
- [Conditions for deploying and upgrading an ESXi host deployed using a custom image (Broadcom KB 341609)](https://knowledge.broadcom.com/external/article/341609/conditions-for-deploying-and-upgrading-a.html) - OEM/custom-image requirements and third-party driver compatibility.
- [Determining network/storage firmware and driver versions in ESXi (Broadcom KB 323110)](https://knowledge.broadcom.com/external/article/323110/determining-networkstorage-firmware-and.html) - PCI identifiers, driver and firmware inventory, and Compatibility Guide comparison.
- [FAQ: Recommendation for drivers/firmware for ESXi hosts (Broadcom KB 318542)](https://knowledge.broadcom.com/external/article/318542/faq-recommendation-for-driversfirmware.html) - vendor ownership of driver/firmware validation and the need to align driver and firmware versions.
- [Reverting to a previous version of ESXi (Broadcom KB 316592)](https://knowledge.broadcom.com/external/article/316592/reverting-to-a-previous-version-of-esxi.html) - alternate-bootbank rollback methods and limitations.
- [Best practices for using VMware snapshots (Broadcom KB 318825)](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html) - snapshots are not backups, delta growth, and consolidation risk.
- [Powering on a VM from suspend state or reverting to a snapshot fails (Broadcom KB 328636)](https://knowledge.broadcom.com/external/article/328636) - suspend-state sensitivity to CPU, BIOS, and ESXi build changes.
- [Unable to migrate VMs from one ESXi host to another (Broadcom KB 403209)](https://knowledge.broadcom.com/external/article/403209/unable-to-migrate-vms-from-one-esxi-host.html) - shared-storage requirements for compute-only vMotion and shared-nothing vMotion as an alternative when another host is available.
- [Local storage prevents standard host evacuation for an upgrade (Broadcom KB 430766)](https://knowledge.broadcom.com/external/article/430766/error-unable-to-access-the-virtual-machi.html) - why compute-only vMotion/DRS cannot evacuate VMs whose files are available only on the source host.
- [Add or register a virtual machine in vCenter Server or ESXi (Broadcom KB 335224)](https://knowledge.broadcom.com/external/article/335224/add-or-register-a-virtual-machine-vm-in.html) - registering an existing `.vmx` through the datastore browser or ESXi CLI.

## Issues Found
1. **Overbroad opening claim about live evacuation** - The post originally said that a standalone ESXi host with local-only storage cannot evacuate running workloads. Local storage prevents compute-only vMotion, but a powered-on VM can be moved with combined compute-and-storage (shared-nothing) vMotion when another compatible host and the required vCenter, licensing, and network are available. Changed the sentence to state explicitly that the planned outage follows from the guide's single-host scenario, where no migration target exists.

## Review Notes
- All shell commands and flags in the post match the current official command references. In particular, the placement of `--dry-run` is valid, and `profile update` preserves installed VIBs that are not superseded while `profile install` can replace the host image and lose OEM VIBs.
- The ESXi 8.0 Update 2 statement is correctly scoped to using `esxcli software vib update` or `vib install` for host updating; individual VIB commands still exist for other supported package operations.
- A configuration bundle can be restored only to the matching ESXi build and normally the matching host UUID. For TPM-protected configuration from ESXi 7.0 Update 2 onward, a force override cannot compensate for loss of the original TPM. The post appropriately warns that the bundle is not a VM backup and excludes VM inventory and bootbank data.
- Alternate-bootbank rollback is conditional and may be unavailable after partition-layout changes or subsequent bootbank-changing operations, so the post is correct not to treat it as the sole recovery path.
- The ordinary VM Suspend warning is correct. Lifecycle Manager's separate Suspend to Memory feature is limited to supported patch remediations with Quick Boot and is not a general major-upgrade substitute.
- RAID physical-disk health may require server-vendor controller or out-of-band tooling; the post asks readers to check it without incorrectly implying that the listed ESXCLI commands alone provide that health assessment.
