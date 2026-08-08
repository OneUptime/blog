# Validation Summary: ESXi Datastore Disappeared After Firmware Update: Driver, HCL, and LUN Checks

## Status
validated

## Post Type
Troubleshooting guide / operational runbook

## Technologies Covered
- VMware ESXi and vSphere Client
- ESXCLI, `vmkchdev`, `vmware`, and `vmkfstools`
- VMFS datastores, datastore UUIDs, and snapshot LUN handling
- Fibre Channel HBAs, SAN zoning, LUN masking, and multipathing
- Software iSCSI, VMkernel networking, discovery, and CHAP
- Broadcom Compatibility Guide, OEM images, storage drivers, and firmware
- Local RAID controllers and ESXi bootbank rollback
- APD, PDL, and vSphere On-disk Metadata Analyzer (VOMA)

## Sources Consulted
- [Broadcom ESXCLI storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html)
- [Broadcom ESXCLI software command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_software.html)
- [KB 323110: Determining Network/Storage firmware and driver version in ESXi](https://knowledge.broadcom.com/external/article/323110/determining-networkstorage-firmware-and.html)
- [KB 318542: FAQ: Recommendation for drivers/firmware for ESXi hosts](https://knowledge.broadcom.com/external/article/318542/faq-recommendation-for-driversfirmware-f.html)
- [KB 315329: Supported drivers and firmware versions for I/O devices](https://knowledge.broadcom.com/external/article/315329/supported-drivers-and-firmware-versions.html)
- [KB 375516: Datastores disappear after patching ESXi hosts](https://knowledge.broadcom.com/external/article/375516/datastores-disappear-after-patching-esxi.html)
- [KB 373287: ESXi host lost the Datastores after patching/upgrade](https://knowledge.broadcom.com/external/article/373287/esxi-host-lost-the-datastores-after-patc.html)
- [KB 439378: Local datastore missing after upgrading ESXi host to 8.0 Update 3](https://knowledge.broadcom.com/external/article/439378/local-datastore-missing-after-upgrading.html)
- [KB 417176: How to check which driver versions will change after an ESXi upgrade](https://knowledge.broadcom.com/external/article/417176/how-to-check-which-driver-versions-will.html)
- [KB 432310: Dell HBA355i adapter missing after ESXi 8.0 upgrade](https://knowledge.broadcom.com/external/article/432310/dell-hba355i-adapter-missing-after-esxi.html)
- [KB 373820: Bootbank pointing to /tmp due to a storage adapter marked for passthrough](https://knowledge.broadcom.com/external/article/373820/bootbank-pointing-to-tmp-due-to-storage.html)
- [KB 388503: HBA is missing after ESXi reboot or upgrade](https://knowledge.broadcom.com/external/article/388503/hba-is-missing-after-esxi-reboot.html)
- [KB 308546: Performing a rescan of the storage on an ESXi host](https://knowledge.broadcom.com/external/article/308546/performing-a-rescan-of-the-storage-on-an.html)
- [KB 426024: ESXi FC switch storage paths are not detected after host reboot](https://knowledge.broadcom.com/external/article/426024/esxi-fc-switch-storage-paths-are-not-det.html)
- [KB 323129: Troubleshooting LUN connectivity issues on ESXi hosts](https://knowledge.broadcom.com/external/article/323129/troubleshooting-lun-connectivity-issues.html)
- [KB 323127: Troubleshooting Fibre Channel storage connectivity](https://knowledge.broadcom.com/external/article/323127/troubleshooting-fibre-channel-storage-co.html)
- [KB 311055: Troubleshooting ESXi connectivity to iSCSI arrays using software initiators](https://knowledge.broadcom.com/external/article/311055/troubleshooting-esxi-connectivity-to-is.html)
- [KB 323142: Troubleshooting LUNs detected as snapshot LUNs in vSphere](https://knowledge.broadcom.com/external/article/323142/troubleshooting-luns-detected-as-snapsho.html)
- [KB 316592: Reverting to a previous version of ESXi](https://knowledge.broadcom.com/external/article/316592/reverting-to-a-previous-version-of-esxi.html)
- [KB 409405: Datastore or LUN missing after reboot](https://knowledge.broadcom.com/external/article/409405/datastore-or-lun-missing-after-reboot.html)
- [KB 318712: Permanent Device Loss and All-Paths-Down in vSphere ESXi](https://knowledge.broadcom.com/external/article/318712/permanent-device-loss-pdl-and-allpathsdo.html)
- [KB 318894: Using vSphere On-disk Metadata Analyzer](https://knowledge.broadcom.com/external/article/318894/using-vsphere-ondisk-metadata-analyzer-v.html)
- [KB 438232: Irrecoverable data loss after deleting a VMFS datastore and creating a new volume](https://knowledge.broadcom.com/external/article/438232/irrecoverable-data-loss-after-deleting-a.html)

## Issues Found
- The post treated firmware shown on a generic I/O Compatibility Guide driver line as an exact prescribed driver-firmware pair. Broadcom states that this value records the certification test level or minimum at certification, while the current supported pairing should be confirmed in the OEM or device-vendor matrix. The adapter, HCL, local-controller, and recovery-validation wording was corrected to distinguish a certified driver from vendor-supported firmware pairing. The dedicated vSAN Compatibility Guide remains authoritative for vSAN controller combinations.
- The PCI classification put an unsupported adapter in the branch where the PCI device itself is absent. The table now puts unsupported adapters, PCI passthrough, and driver binding in the PCI-visible-but-no-storage-adapter branch, while the PCI-absent branch points to BIOS, slot/riser, hardware, and firmware checks.
- The rescan breadcrumb mixed ESXi Host Client and vSphere Client terminology, and described an HBA rescan as the complete CLI equivalent of the UI operation. The vSphere Client path was corrected to **Storage > Rescan Storage** from the host context, the dialog's device and VMFS scan choices were noted, and the documented `vmkfstools -V` VMFS discovery step was added after `esxcli storage core adapter rescan --all`. The earlier inventory breadcrumb was also corrected to include the **Storage** section.
- Recovery validation required the original VMFS UUID to return without resignaturing in every case. Broadcom documents legitimate snapshot-LUN recovery procedures that assign a new UUID. The criterion now accepts the original UUID when the original LUN identity is restored or the expected new UUID when a documented resignature procedure was required.
- The ESXi 8.0 Update 3 sentence was clarified to say the issue occurs after upgrading to that release. An unsupported frequency claim that the data is “usually” behind a discovery-layer failure was changed to neutral, evidence-based wording.

## Review Notes
- All commands in the corrected post are current and syntactically valid according to Broadcom documentation. This includes `vmware -vl`, the storage adapter/device/path/filesystem inventory commands, `vmkchdev -l`, `esxcli storage san fc list`, `esxcli software vib list`, `esxcli storage core adapter rescan --all`, and `vmkfstools -V`.
- All six links originally listed under Official Documentation resolve successfully to the intended Broadcom knowledge-base articles.
- `vmkchdev -l | grep -i vmhba` is appropriate for PCI devices already associated with VMkernel storage adapters. A broader PCI inventory is needed when investigating a device that is PCI-visible but has no `vmhba` association.
- ESXi rollback remains method- and bootbank-dependent. Broadcom documents additional limitations, including the partition-layout restriction when upgrading from pre-7.0 releases and loss of the prior rollback state after certain subsequent software changes; the post appropriately keeps rollback conditional.
