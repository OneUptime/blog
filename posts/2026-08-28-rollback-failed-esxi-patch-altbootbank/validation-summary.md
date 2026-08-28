# Validation Summary: How to Roll Back a Failed ESXi Patch Using `altbootbank`

## Status

validated

## Post Type

Technical recovery guide and operational runbook

## Technologies Covered

- VMware ESXi boot lifecycle, `/bootbank`, and `/altbootbank`
- ESXi DCUI Recovery Mode and the `Shift+R` rollback workflow
- ESXi Shell and BusyBox utilities
- ESXCLI software image-profile inspection
- vSphere Lifecycle Manager and Update Manager
- vSphere HA/FDM, vSAN, NSX, and OEM image compatibility
- ESXi boot media, host-configuration backup, and VMFS-preserving reinstallation

## Sources Consulted

- [Broadcom KB 316592: Reverting to a previous version of ESXi](https://knowledge.broadcom.com/external/article/316592/reverting-to-a-previous-version-of-esxi.html)
- [Broadcom KB 376175: Unable to rollback ESXi Version as Bootbank and Altbootbank have the same build number](https://knowledge.broadcom.com/external/article/376175/unable-to-rollback-esxi-version-as-bootb.html)
- [Broadcom KB 386377: Cannot revert ESXi version when upgrading from 7.0 to 8.0](https://knowledge.broadcom.com/external/article/386377)
- [Broadcom KB 418630: Roll back incorrect host updates](https://knowledge.broadcom.com/external/article/418630/roll-back-incorrect-host-updates.html)
- [Broadcom KB 418807: ESXi Host Rolls Back to Previous Version After Upgrade](https://knowledge.broadcom.com/external/article/418807/esxi-host-rolls-back-to-previous-version.html)
- [Broadcom KB 445039: ESXi failed to boot after loading `state.tgz`](https://knowledge.broadcom.com/external/article/445039/esxi-failed-to-boot-up-with-error-fatal.html)
- [Broadcom KB 306902: ESXi host loses complete or partial configuration after a reboot](https://knowledge.broadcom.com/external/article/306902)
- [Broadcom KB 324231: Bootbank update ordering and the `updated=` field](https://knowledge.broadcom.com/external/article/324231)
- [VMware `esx-boot` source: bootbank validation and recovery selection](https://github.com/vmware/esx-boot/blob/master/safeboot/bootbank.c)
- [Broadcom ESXCLI Command Reference: `esxcli software`](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_software.html)
- [Broadcom KB 320235: Determining VMware software version and build number](https://knowledge.broadcom.com/external/article/320235)
- [Broadcom KB 444007: Recovering a missing network driver with Recovery Mode](https://knowledge.broadcom.com/external/article/444007/missing-network-driverhost-is-down.html)
- [Broadcom KB 318029: Bootbank loads in `/tmp` after reboot](https://knowledge.broadcom.com/external/article/318029/bootbank-loads-in-tmp-after-reboot-of-es.html)
- [Broadcom KB 373820: Bootbank points to `/tmp` when a boot adapter is in passthrough](https://knowledge.broadcom.com/external/article/373820)
- [Broadcom KB 426834: Bootbank points to `/tmp` when the boot-device driver is unavailable](https://knowledge.broadcom.com/external/article/426834/unable-to-patch-or-upgrade-an-esxi-host.html)
- [Broadcom KB 373403: Stateless Auto Deploy bootbank behavior](https://knowledge.broadcom.com/external/article/373403)
- [Broadcom KB 442207: Repairing a corrupted alternate bootbank](https://knowledge.broadcom.com/external/article/442207/esxi-host-addon-installation-fails-with.html)
- [Broadcom KB 313510: How to back up and restore the ESXi host configuration](https://knowledge.broadcom.com/external/article/313510/how-to-back-up-and-restore-the-esxi-host.html)
- [Broadcom KB 392956: How to preserve a VMFS datastore while installing ESXi](https://knowledge.broadcom.com/external/article/392956)
- [Broadcom KB 409855: VMFS caveats after an ESXi reinstall](https://knowledge.broadcom.com/external/article/409855/local-datastores-disappear-after-reinsta.html)
- [Broadcom KB 306962: Location and contents of ESXi log files](https://knowledge.broadcom.com/external/article/306962/location-of-esxi-log-files.html)
- [Broadcom KB 410936: Possible inventory issues after host rollback](https://knowledge.broadcom.com/external/article/410936)
- [Broadcom KB 317631: SD card/USB boot-device revised guidance](https://knowledge.broadcom.com/external/article/317631/sd-cardusb-boot-device-revised-guidance.html)

## Issues Found

- The post treated a different `build=` value as necessary for every useful rollback and implied that matching build values meant no prior image state could be recovered. This was narrowed to an earlier ESXi *base build*: VIB-only states can differ while retaining the same base build, and matching `build=` values do not prove that the banks are identical. The post now explains that `updated=` gives ordering information rather than a VIB inventory and that a same-build target must be confirmed from the exact change history.
- The post diagnosed a bootbank resolving to `/tmp` as boot-media corruption. This was corrected because `/tmp` means that ESXi did not mount the persistent bank and fell back to a RAM-backed location; Broadcom also documents delayed discovery, missing drivers, passthrough configuration, and stateless deployment as possible causes. Reinstallation is now conditional on being unable to recover a valid persistent bank.
- The post categorically prohibited copying between bootbanks or editing `boot.cfg`. Those remain unsafe as improvised rollback techniques, but Broadcom publishes narrow, diagnosis-specific procedures that can include those actions. The warning was qualified so such changes are made only under an exact Broadcom procedure or Broadcom Support direction.

## Review Notes

- All command examples are syntactically valid for ESXi Shell. `vmware -vl` reports the active version/build, and `esxcli software profile get` reports the installed image profile. The `ls` and `grep -E` inspection commands are read-only and use fields present in Broadcom's documented `boot.cfg` examples.
- The `Shift+R` timing, permanent-replacement warning, `Y` confirmation, and final Enter step match Broadcom KB 316592. The supported update methods, `tools-light` exception, pre-7-to-7 partition-layout restriction, and rollback compatibility among ESXi 7, 8, and 9 were also confirmed.
- All six official-documentation links in the post resolve to the described Broadcom articles.
- ESXi configuration-bundle restoration requires the destination host to use the exact build represented by the backup and normally the same UUID. TPM-encrypted configurations from ESXi 7.0 U2 onward add same-TPM constraints. The post's instruction to use the version-matched Broadcom procedure is therefore important.
- The VMFS-preserving installer option and listed log paths are correct. Preservation remains dependent on the storage layout, and the option does not preserve the prior host configuration.
