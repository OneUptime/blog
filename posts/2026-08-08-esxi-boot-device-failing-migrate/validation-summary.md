# Validation Summary: Migrate a Failing ESXi USB or SD Boot Device to Persistent Storage

## Status
validated

## Post Type
Technical recovery and migration guide

## Technologies Covered
- VMware ESXi 7.x and 8.x
- VMware ESX 9.x / VMware Cloud Foundation 9.0
- VMware vSphere and the ESXi Host Client
- USB and SD-card boot media
- SATA, SAS, NVMe, HDD, and SSD persistent boot storage
- ESX-OSData and VMFS-L system storage
- VMFS datastores
- ESXCLI and `vim-cmd`
- ESXi host configuration backup and restore
- TPM, Secure Boot, DPU / Distributed Services Engine, Auto Deploy, vSAN, and NSX considerations

## Sources Consulted
- [Broadcom KB 413897: Replacing ESXi boot device from SD card to internal disk](https://knowledge.broadcom.com/external/article/413897) - the supported same-build reinstall and configuration-restore workflow.
- [Broadcom KB 317631: SD card/USB boot device revised guidance](https://knowledge.broadcom.com/external/article/317631) - USB/SD support status, persistent-media designs, native-device requirements, endurance guidance, and 8.x/9.x system-storage sizes.
- [Broadcom KB 317891: Persistent storage warnings when booting ESXi from SD-Card/USB devices](https://knowledge.broadcom.com/external/article/317891) - warning meanings and the documented `autoPartition=TRUE` remedy.
- [Broadcom KB 313264: Additional Kernel boot options available in ESXi 7.0 and later versions](https://knowledge.broadcom.com/external/article/313264) - exact `autoPartition` behavior and its ESX 9.x exclusion.
- [Broadcom KB 416162: Installing ESXi 8.0 fails with RuntimeError because the disk does not support OSDATA](https://knowledge.broadcom.com/external/article/416162) - ESXi 8 fresh-install minimum and non-shared boot-device requirement.
- [Broadcom KB 374490: Minimum boot-device guidance for upgrades to ESX 9.0](https://knowledge.broadcom.com/external/article/374490) - the distinction between certain upgrade boot-disk minimums and the 128 GiB all-in-one persistent design.
- [Broadcom KB 313510: How to back up and restore the ESXi host configuration](https://knowledge.broadcom.com/external/article/313510) - backup commands, build/UUID/TPM constraints, maintenance mode, reboots, VM inventory exclusions, DPU limitations, and Auto Deploy exclusion.
- [Broadcom KB 316424: How to prepare a TPM-enabled host for hardware replacement](https://knowledge.broadcom.com/external/article/316424) - TPM-bound configuration considerations when hardware changes.
- [Broadcom KB 392956: How to preserve VMFS while upgrading or installing ESXi](https://knowledge.broadcom.com/external/article/392956) - exact installer option names and their general behavior.
- [Broadcom KB 409855: Local datastores disappear after reinstalling with preserve VMFS](https://knowledge.broadcom.com/external/article/409855) - the ESXi 7.x multiple-VMFS-partition limitation.
- [Broadcom KB 309334: ESXi fails to boot with Error Loading /s.v00 or Fatal Error 8](https://knowledge.broadcom.com/external/article/309334) - possible causes of those boot errors.
- [Broadcom KB 395397: Bootbank loss with SCSI device timeouts](https://knowledge.broadcom.com/external/article/395397) - storage-device, RAID, controller, and backplane failure causes and vendor-diagnostics guidance.
- [Broadcom KB 319492: Configuring a diagnostic coredump partition](https://knowledge.broadcom.com/external/article/319492) - confirmation that ESXi 7.0 and later default to a coredump file in ESX-OSData.
- [Broadcom KB 318625: Statement about supportability of cloning ESXi boot devices](https://knowledge.broadcom.com/external/article/318625) and [KB 318630: VMFS corruption risk from cloned boot devices](https://knowledge.broadcom.com/external/article/318630) - unsupported cloning and duplicated system UUID behavior.
- [Broadcom ESXCLI system command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_system.html) and [storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html) - current syntax and semantics for every listed ESXCLI command.
- [Broadcom vSphere Web Services API: HostSystem maintenance mode](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.HostSystem.html) - prohibition on powering on VMs while a host remains in maintenance mode.
- [Broadcom KB 312831: Virtual machines appear invalid, orphaned, or inaccessible](https://knowledge.broadcom.com/external/article/312831) - VM re-registration through Datastore Browser.
- [Broadcom Compatibility Guide](https://compatibilityguide.broadcom.com/) - authoritative hardware, controller, firmware, and driver compatibility source.

## Issues Found
1. The symptom list could imply that persistent-storage warnings and the cited boot errors uniquely diagnose a failing boot device. Added a clarification that these messages have other documented causes and must be correlated with device/controller health and logs.
2. The inventory commands checked only a partition-based coredump target. ESXi 7.0 and later normally use a file in ESX-OSData, and a host can also use network coredump. Added the current `esxcli system coredump file get` and `esxcli system coredump network get` commands.
3. The disk-selection warning said targeting a VMFS disk necessarily causes data loss, although a correctly selected preserve-VMFS path can retain a datastore. Changed the absolute claim to “can cause data loss.”
4. The ESX 9.x 128 GB statement was too broad because Broadcom separately documents smaller boot-disk minimums for some upgrade layouts. Scoped 128 GB to the revised all-in-one persistent boot and system-storage design.
5. The `autoPartition=TRUE` description incorrectly treated it as a device-targeted option that initializes one device. Corrected it to state that ESXi 7.x/8.x automatically partitions unused local devices, that it is not a discovery or device-targeting option, and that it does not apply to ESX 9.x.
6. The configuration-restore restrictions omitted two current platform exclusions. Added that Broadcom does not support this backup/restore workflow on Distributed Services Engine hosts with DPUs and that it does not apply to Auto Deploy hosts.
7. The raw-clone warning said a copy could reproduce unreadable sectors. Corrected it to explain that unreadable source sectors can make the copy fail or leave it incomplete; retained the documented warnings about corruption, obsolete layout, copied identifiers, and unsupported cloning.
8. The preserve-VMFS option was described as retaining VMFS without qualification. Added Broadcom's ESXi 7.x caveat that only the first VMFS partition is preserved on a selected disk containing multiple VMFS partitions.
9. The restore paragraph implied that the restore command enters maintenance mode. Corrected it to state that the documented workflow requires the operator to enter maintenance mode and reboot before restoration, after which the restore command initiates another reboot.
10. The validation sequence attempted to start a test workload immediately after instructing the reader to keep the host in maintenance mode. Added the required exit from maintenance mode before powering on the low-risk workload.

## Review Notes
- All original seven Broadcom KB URLs resolved to the intended articles, and their titles and claims match the post.
- All terminal commands are syntactically valid and current. The two `vim-cmd` backup commands match Broadcom's supported workflow; the ESXCLI commands match the current official command reference.
- The ESXi 8 32 GiB requirement cited in the post applies to fresh installation. Broadcom explicitly notes that this restriction does not apply to an ESXi 7.x-to-8.x upgrade.
- USB/SD boot remains supported but not recommended on previously certified platforms through VCF 9.0 update releases. New server designs should use supported persistent media.
- A host configuration bundle excludes VM information and bootbank contents. The post correctly treats VM backups and VMX-path inventory as separate recovery artifacts.
