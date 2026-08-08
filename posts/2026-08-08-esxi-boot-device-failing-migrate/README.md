# Migrate a Failing ESXi USB or SD Boot Device to Persistent Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Boot Device, Persistent Storage, USB, SD Card, ESX-OSData

Description: Replace a failing ESXi USB or SD boot device with supported persistent storage while protecting VMFS data, host configuration, and rollback options.

---

A running ESXi host can continue serving VMs after losing reliable access to its boot device, but that is borrowed time. Configuration writes, logging, updates, and the next boot can fail. Preserve workload data and host state while the host is reachable, then perform a controlled installation onto supported persistent storage.

There is no general-purpose command that safely moves an installed ESXi system from one device to another in place. The durable migration is normally a fresh ESXi installation on the new device, followed by supported configuration restoration or deliberate reconfiguration. If USB or SD contains only bootbanks and ESX-OSData is already persistent elsewhere, the layout differs, but a physically failing boot device still needs replacement.

## Treat the Warning as an Incident

Common evidence includes:

- boot-device read or write errors in hardware, VMkernel, or installer logs;
- `/bootbank` or `/altbootbank` missing or inaccessible;
- **No persistent storage available for system logs and data**;
- `Error Loading /s.v00` or `Fatal Error: 8 (Device Error)` at boot;
- configuration changes that disappear after a reboot;
- image extraction or update failures involving OSData; and
- SD, USB, RAID, or controller health alarms from the server's management controller.

Do not keep rebooting to test a deteriorating device. If the host is running and manageable, use the remaining session to evacuate workloads or shut them down cleanly, collect inventory, and obtain a configuration bundle. If storage-controller errors implicate more than the boot medium, pause and involve the server vendor before assuming that only a USB stick has failed.

Broadcom's current guidance still describes supported USB and SD cases for previously certified systems through current product releases, but recommends persistent boot and OSData media. The operational concern is reliability and endurance, not merely whether the installer accepts the device.

## Determine What Is Actually Failing

Use the Host Client, out-of-band controller, and read-only commands to map the system:

```bash
vmware -vl
esxcli storage core device list
esxcli storage filesystem list
esxcli system syslog config get
esxcli system coredump partition get
ls -ld /bootbank /altbootbank
```

Record:

- the boot device's model, identifier, capacity, controller, and health;
- devices that contain bootbanks, ESX-OSData, scratch, coredump, and VMFS;
- which local disk or array contains production VMs;
- ESXi build, OEM image profile, firmware, and driver versions;
- whether the server uses UEFI or legacy BIOS;
- TPM, Secure Boot, encryption, vSAN, NSX, and DPU state; and
- boot order and controller mode from the firmware interface.

Do not infer disk identity from `naa` ordering or displayed size alone. Capture serial numbers and use the vendor controller inventory. A replacement install that targets the VMFS disk instead of the failed boot disk causes data loss.

If the host reports bootbank loss plus SCSI device timeouts, Broadcom says the underlying cause can be the drive, RAID configuration, controller, or backplane. Run vendor offline diagnostics during the maintenance window and preserve their logs.

## Protect VMs Before Protecting Host Settings

An ESXi configuration bundle does not contain virtual-machine disks, VM inventory, or bootbank contents. Back up or evacuate every VM to storage independent of the affected host. Verify a representative restore and record each VM's `.vmx` path.

If the host belongs to a healthy cluster and migration is safe, evacuate VMs before placing it in maintenance mode. If VMs live only on local storage, plan a guest shutdown and external image-level or application-native backup. Do not create snapshots on the same endangered local device as a substitute for backup.

Avoid storage-heavy changes while boot or controller health is uncertain. Do not consolidate a large snapshot, clone every disk, or run a firmware update merely to prepare the host unless the risk and recovery capacity have been assessed.

## Export the Host Configuration While It Is Reachable

Synchronize the current configuration and create the supported bundle:

```bash
vim-cmd hostsvc/firmware/sync_config
vim-cmd hostsvc/firmware/backup_config
```

Download the generated `configBundle-HostName.tgz` to independent storage. Also export or document standard-switch networking, VMkernel adapters, DNS, NTP, syslog, licenses, certificates, users, storage presentation, multipathing, advanced settings, and any vendor agents.

Broadcom requires the destination ESXi build to match the build that created the bundle, and ordinarily requires the same host UUID. TPM-protected configuration can prevent a forced restore on changed hardware. Do not assume the bundle can be restored to an arbitrary replacement server or a different patch level. Keep a human-readable build sheet so the host can be rebuilt when bundle restoration is not appropriate.

## Select a Supported Persistent Device

Check the Broadcom Compatibility Guide and server vendor matrix for the exact server, controller, device, target ESXi release, and firmware-driver pairing. Prefer the OEM-customized ESXi image when required by the platform vendor.

Broadcom's revised boot guidance recommends a native SATA, SAS, or PCIe NVMe SSD that meets the documented endurance requirements, or an HDD. It cautions that a device reached through a USB conversion does not become a supported native NVMe or SAS boot device.

For ESXi 8.x, Broadcom documents 32 GB as the minimum boot-device size and recommends 128 GB. Its fresh-install KB states that ESXi 8 requires at least 32 GB of persistent HDD, SSD, or NVMe storage and that a boot device must not be shared between ESXi hosts. For ESX 9.x, current guidance raises the minimum to 128 GB. Confirm the exact target release because layout options and minimums change.

Capacity is not the only criterion. Check endurance, performance, redundancy, monitoring, replaceability, controller support, and whether the server can boot it in the required firmware mode.

## Decide Between Two Supported Designs

The cleanest long-term design places bootbanks and ESX-OSData on the new persistent device. This removes dependence on the failing removable medium.

Broadcom also documents a design where USB or SD retains bootbanks and a separate persistent device stores ESX-OSData. That can be valid for certified existing hardware, but it does not solve a boot medium that is already failing. It also leaves two devices to manage. Use this design only when the platform and release documentation explicitly support it.

Do not manually create or move VMFS-L partitions with generic partitioning tools. Broadcom documents automatic selection and installer or upgrade behavior for OSData. The `autoPartition=TRUE` remedy in its persistent-storage warning applies to its described workflow and can initialize a device. It is not a harmless discovery option and must never be aimed at a disk containing needed VMFS data.

## Build the Recovery Package Before Shutdown

Prepare:

- the exact OEM installer ISO and verified checksum;
- the same ESXi build as the configuration bundle, if bundle restoration is planned;
- an independently stored configuration bundle and build sheet;
- verified VM backups and VMX-path inventory;
- vendor firmware and controller configuration records;
- licenses, certificate material, and network configuration;
- out-of-band console, virtual media, and power control; and
- a rollback or rebuild procedure if the new device is not detected.

If the plan also upgrades ESXi, separate the goals where practical. Reinstalling the same known build simplifies configuration recovery and fault isolation. Upgrade only after the host is stable on persistent storage and compatibility has been rechecked.

## Shut Down and Replace the Boot Design

Stop application traffic and shut down or evacuate all VMs. Confirm no backup, replication, snapshot, consolidation, update, or datastore operation remains active. Enter maintenance mode if host management is still functional.

Use the server vendor's replacement procedure. Label every device and preserve the failed medium without modifying it. Do not raw-clone the old USB or SD card as the production migration method: a block copy can reproduce corruption, an obsolete partition layout, device identifiers, and unreadable sectors without providing a supported recovery state.

Boot the approved installer through out-of-band media. At disk selection, match the intended new persistent device by vendor inventory and capacity. If the device also contains a VMFS datastore, the installer presents materially different choices:

- **Install ESXi, preserve VMFS datastore** keeps VMFS but replaces host configuration;
- **Upgrade ESXi, preserve VMFS datastore** applies only when a compatible installation is detected; and
- **Install ESXi, overwrite VMFS datastore** erases VMFS data.

Broadcom warns that failing to choose a preserve-VMFS option clears both ESXi and the datastore. If the screen does not identify the expected disk and preserve option, cancel. Never experiment against the only VM copy.

## Restore or Rebuild the Configuration

After the fresh host boots, verify the ESXi build, boot mode, new device, system-storage layout, scratch, syslog, and coredump before adding workloads. Confirm `/bootbank` and `/altbootbank` resolve normally and the hardware controller reports healthy media.

Restore the configuration bundle only when Broadcom's build, UUID, TPM, and platform requirements are satisfied. The documented restore enters maintenance mode and reboots the host. Treat it as a change with console access, not as a live troubleshooting command.

When requirements do not match, reconfigure the host from the build sheet through supported UI or API workflows. Recreate management networking first, then storage, VMkernel services, standard switches, time, logging, access, licensing, and integrations. A configuration restore does not re-register VMs; use Datastore Browser to register intact `.vmx` files if necessary.

## Validate Before Returning Workloads

Keep the host in maintenance mode while checking:

- the intended device supplies bootbanks and the expected ESX-OSData layout;
- scratch, syslog, and coredump are persistent and writable;
- both a cold boot and a controlled reboot complete without device errors;
- firmware, drivers, and OEM image profile match the support matrix;
- VMFS datastores mount with their original UUIDs and capacity;
- management, storage, vMotion, vSAN, and workload networks behave as designed; and
- no old removable boot device remains first in the firmware boot order.

Start one low-risk workload and test console, guest network, storage I/O, time, monitoring, and backup. Then restore service in dependency order. Retain the failed device, configuration bundle, installer, and external VM backups through the observation period.

## Official Documentation

- [SD card and USB boot device revised guidance](https://knowledge.broadcom.com/external/article/317631)
- [Persistent storage warnings for SD and USB boot devices](https://knowledge.broadcom.com/external/article/317891)
- [ESXi 8 persistent boot-device minimum](https://knowledge.broadcom.com/external/article/416162)
- [How to back up and restore ESXi host configuration](https://knowledge.broadcom.com/external/article/313510)
- [How to preserve VMFS while installing or upgrading ESXi](https://knowledge.broadcom.com/external/article/392956)
- [Boot failure with Error Loading s.v00 or Fatal Error 8](https://knowledge.broadcom.com/external/article/309334)
- [Bootbank loss associated with underlying storage failure](https://knowledge.broadcom.com/external/article/395397)

## Conclusion

A failing USB or SD boot device is a recovery event, not a routine file copy. Protect VMs and configuration first, identify every physical disk, select supported persistent media, and install ESXi with the preserve-VMFS choice only when it is explicitly available and intended. Validate persistent OSData, logs, coredump, networking, and storage before returning production workloads.
