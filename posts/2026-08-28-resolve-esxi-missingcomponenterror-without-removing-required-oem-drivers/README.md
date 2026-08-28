# How to Resolve ESXi `MissingComponentError` Without Removing Required OEM Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, vSphere, vSphere Lifecycle Manager, MissingComponentError, OEM Drivers, Patching

Description: Diagnose ESXi reserved-component metadata failures and choose a supported vLCM or OEM-image upgrade path without deleting hardware drivers named in the error.

---

An ESXi patch or upgrade can fail with `[MissingComponentError] Missing reserved components ...` followed by a list of storage, network, management, or OEM components. The wording is easy to misread: it does not necessarily say those VIBs are absent from the running host. Broadcom documents cases where the VIBs are installed but the metadata under `/var/db/esximg/reservedComponents` is missing or corrupt.

Removing a listed OEM VIB is therefore both ineffective and dangerous. Broadcom's reproduced case continued to report `storcli` after that VIB was removed. A listed NIC or storage driver may also be the only driver keeping the management uplink or boot/storage controller online.

This guide targets ESXi 8.x hosts failing an esxcli or vSphere Lifecycle Manager (vLCM) image transaction. It does not prescribe manual edits to ESXi image metadata.

## Stop Before Changing the Host Image

Put the host in maintenance mode and confirm working out-of-band console access. Back up the host configuration and export or record the current desired image before experimenting.

Capture the current software state:

```bash
esxcli software profile get
esxcli software component list
esxcli software vib list
vmware -vl
```

Inventory critical hardware paths as well:

```bash
esxcli network nic list
esxcli storage core adapter list
esxcli hardware pci list
```

Save the output off-host. Map each component named in the error to its vendor and purpose. An `icen`, `igbn`, `bnxt`, Fibre Channel, RAID, iLO, AMS, or storage-CLI component is not disposable merely because the upgrade transaction references it.

Do not use `--force`, change the host acceptance level, delete `/var/db/esximg/reservedComponents`, or remove VIBs to make the message shorter. Those actions can leave the installed image inconsistent or make devices disappear after reboot.

## Confirm Which Failure You Have

Record the complete error and inspect the corresponding timestamp in `/var/run/log/esxupdate.log`. For vLCM or VCF workflows, preserve the vCenter Update Manager and SDDC Manager logs as applicable.

There are two important supported patterns.

### A vLCM-managed image is being updated with esxcli

Run:

```bash
esxcli software profile get
```

Broadcom's example identifies a vLCM-created state with a name such as `(Updated) VMware Lifecycle Manager Generated Image`. For this condition, Broadcom's workaround is to stop applying the patch with `esxcli software profile update`. Import the patch into the vLCM depot, construct the desired image there, run compliance and remediation through vLCM, and retain the required vendor add-on and components.

### Reserved-component metadata is missing or corrupt

Broadcom KB 427454 documents the same error during VUM/SDDC Manager remediation and attributes it to missing or corrupt data under `/var/db/esximg/reservedComponents`. The KB states that there is no in-place resolution and gives an interactive ISO upgrade from the direct console as the workaround.

Do not try to recreate the directory from another host. Reserved metadata must match the exact image history and hardware-specific component set; copying it creates an unvalidated state.

## Build a Desired Image That Preserves OEM Support

For a vLCM-managed cluster, compose the target image from deliberate inputs:

1. Select the required ESXi base image.
2. Add the server vendor's certified OEM add-on.
3. Retain any independently supplied component that the hardware or solution requires.
4. If a Hardware Support Manager is used, validate the compatible firmware/driver combination.
5. Run the vLCM image validation, hardware-compatibility, and compliance checks before remediation.

Do not substitute a vanilla image for an OEM image without proving that every boot, storage, network, and management device is supported by the inbox driver set. Broadcom provides current OEM Custom ISOs and OEM Add-ons in the Support Portal; older certified combinations may have to come from the OEM.

Compare the proposed image with the captured `software component list` and `software vib list`. A component may legitimately be superseded by a newer certified version, but it should not silently disappear when the hardware still depends on it.

## Use Interactive ISO Upgrade for Corrupt Reserved Metadata

When the error matches Broadcom KB 427454, plan the ISO path rather than dismantling the running image:

1. Verify the server model, devices, firmware, and target ESXi release in the Broadcom Compatibility Guide and the OEM release notes.
2. Download the certified OEM Custom ISO for that server and ESXi release. If no suitable current image exists, obtain the supported image or add-on from the OEM before proceeding.
3. Verify the download checksum and preserve the host configuration backup off-host.
4. Evacuate workloads, enter maintenance mode, and open the physical remote console.
5. Boot the ISO and follow Broadcom's **Upgrade Hosts Interactively** procedure. Review the installer choice carefully so the intended ESXi installation and datastore are selected.
6. Do not choose a fresh installation or overwrite a VMFS datastore as an improvised fix. If the installer cannot offer the supported upgrade path, stop and open a Broadcom/OEM case.

The console upgrade rebuilds the image through the installer while the OEM ISO supplies the vendor-certified components. It avoids deleting live drivers one at a time.

## Validate Before Returning the Host to Service

After the first reboot, keep the host in maintenance mode and compare against the baseline:

```bash
vmware -vl
esxcli software profile get
esxcli software component list
esxcli software vib list
esxcli network nic list
esxcli storage core adapter list
```

Verify that all expected physical NICs, HBAs, RAID/storage paths, datastores, and management integrations are present. Review boot and update logs for component or signature failures, then run vLCM compliance again. Only reconnect workloads after management redundancy, storage multipathing, and the hardware vendor's health checks pass.

## Rollback and Recovery Cautions

The ESXi boot-menu rollback mechanism can return to the previous image only when a usable previous image remains in `altbootbank`; it is not a substitute for a configuration backup or recovery media. An image rollback can also restore older drivers that require their matching firmware.

If a critical NIC or storage device disappears, use the console, stop workload placement, and follow the OEM recovery procedure. Do not keep installing arbitrary VIB versions until a device appears. Preserve the failed image state and logs for Broadcom and the hardware vendor.

## Limitations and Version Scope

`MissingComponentError` is a class of image-transaction failures, not one universal defect. The vLCM workaround in Broadcom KB 391486 and the ISO workaround in KB 427454 address different observed states. Match the profile ownership, complete error, logs, ESXi build, and workflow before selecting one. VCF-managed hosts must also remain within the VCF bill of materials and SDDC Manager procedure.

## Official Documentation

- [VUM remediation fails because reserved components are corrupt (Broadcom KB 427454)](https://knowledge.broadcom.com/external/article/427454/vum-remediation-installation-of-an-esxi.html)
- [esxcli profile update reports missing reserved components (Broadcom KB 391486)](https://knowledge.broadcom.com/external/article/391486/upgrading-esxi-through-esxcli-software-p.html)
- [Download ESXi OEM Custom ISOs and add-ons (Broadcom KB 366685)](https://knowledge.broadcom.com/external/article/366685/vmware-vsphere-downloads-oem-custom-imag.html)
- [Upgrade ESXi hosts interactively](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/esx-upgrade/upgrading-esxi-hosts-upgrade/upgrade-or-migrate-hosts-interactively-upgrade.html)
- [Back up and restore ESXi host configuration (Broadcom KB 313510)](https://knowledge.broadcom.com/external/article/313510/how-to-back-up-and-restore-the-esxi-host.html)
- [Working with the vSphere Lifecycle Manager depot](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/managing-host-and-cluster-lifecycle-8-0/working-with-vsphere-lifecycle-manager-depots/updating-the-vlcm-depot.html)

## Conclusion

Treat `MissingComponentError` as an image-integrity and image-ownership problem, not as an instruction to uninstall every component it names. Preserve the hardware inventory, use vLCM for a vLCM-generated image, and use the documented OEM ISO upgrade when reserved metadata is corrupt. That repairs the image while keeping required drivers in the supported design.
