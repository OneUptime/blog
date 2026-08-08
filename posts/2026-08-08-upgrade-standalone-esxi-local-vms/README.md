# Upgrade a Standalone ESXi Host When Every VM Is Stored Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Standalone Host, Upgrade, Local Datastore, VMFS, Maintenance

Description: Upgrade a standalone ESXi host with local-only VMs by creating external recovery copies, powering workloads down, and preserving VMFS deliberately.

---

In the single-host scenario described here, there is nowhere to evacuate running workloads stored on local-only VM storage. The maintenance window is therefore a planned outage, and the local datastore must not be the only recovery copy. An ESXi host-configuration backup does not include VM disks and does not include the bootbank.

The safe plan creates independent VM backups, verifies hardware and image compatibility, records the local disk layout, powers off every VM, enters maintenance mode, and uses an upgrade method that explicitly preserves VMFS.

## Define the Recovery Objective First

Inventory every registered VM, template, datastore, RDM, pass-through device, virtual switch, VLAN, license, certificate dependency, and host service. Identify VMs whose disks span more than one datastore and any ISO or floppy references.

For each VM, define:

- shutdown owner and sequence;
- last verified backup outside the host;
- application-consistency method;
- restore destination if the server does not boot; and
- priority and validation test after upgrade.

A snapshot on the same local datastore is not an upgrade backup. It depends on the same disks and increases storage and consolidation risk. Create an image-level or guest-native backup to independent storage and test at least one representative restore.

## Check Upgrade and Hardware Support

Before downloading an image, verify:

- the source-to-target ESXi upgrade path;
- server model, CPU, boot mode, TPM, and device compatibility;
- NIC, HBA, RAID controller, and local-storage driver-firmware pairs;
- VM hardware and guest support;
- backup-product compatibility; and
- licensing and management interoperability.

Use the server vendor's OEM-customized image or add-on when its support policy requires one. Record the complete PCI IDs and compare with the Broadcom Compatibility Guide for the exact target update. A generic image can omit the async storage or network driver that makes the standalone host accessible.

Read the target release notes and server-vendor advisory. Confirm out-of-band console and virtual-media access before the outage.

## Record the Current Host and Disk Layout

Capture read-only inventory:

```bash
vmware -vl
esxcli software profile get
esxcli software vib list
esxcli storage filesystem list
esxcli storage core device partition list
esxcli network nic list
```

Export screenshots or configuration for standard switches, port groups, VMkernel adapters, DNS, NTP, syslog, storage, local users, lockdown state, certificates, and advanced settings.

Record which physical device contains ESXi and which contains VMFS. If ESXi and local VMFS share a device, photograph or export the partition table and device identifier. During interactive installation, selecting the wrong disk or overwrite option destroys the local VM data.

## Back Up the Host Configuration

Synchronize and create the supported configuration bundle:

```bash
vim-cmd hostsvc/firmware/sync_config
vim-cmd hostsvc/firmware/backup_config
```

Download the resulting `configBundle-HostName.tgz` away from the host. Broadcom documents strict restore requirements: destination build must match the backup build and the host UUID normally must match. With TPM-protected configuration in newer releases, forcing a restore onto changed hardware might not work.

The bundle does not contain VM inventory data or bootbank contents. Keep a separate VM inventory with each `.vmx` path so VMs can be registered again from the datastore after a rebuild.

## Prepare Rollback and Rescue Paths

Have these available before shutdown:

- exact target OEM ISO or offline bundle with verified checksum;
- current or prior ESXi installer for rollback or reinstall;
- host configuration bundle;
- external VM backups;
- server-vendor firmware package and support contacts;
- local datastore and VMX path inventory; and
- remote KVM, virtual media, and power control.

An alternate bootbank rollback is available only for supported update methods and conditions. Do not make it the only recovery plan. A reinstall with **Install ESXi, preserve VMFS datastore** can retain VMFS in supported layouts, but host configuration is lost and edge cases with multiple local partitions or vendor platforms require product-specific guidance.

## Shut Down Workloads Cleanly

Stop application traffic and take final application-consistent backups. Shut down guests through their operating systems in dependency order. Confirm power state from both Host Client and console.

Do not use Suspend as a general substitute. A suspend file remains tied to VM state, datastore capacity, CPU compatibility, and a successful host return.

After all VMs are off, enter host maintenance mode:

```bash
vim-cmd hostsvc/maintenance_mode_enter
```

Confirm no VM, backup, snapshot, consolidation, clone, or datastore task remains active. If local vCenter or another management appliance runs on this host, arrange direct Host Client and out-of-band access before shutting it down.

## Choose a Supported Upgrade Method

For a major upgrade or when boot and disk selection need visual confirmation, interactive OEM ISO media provides an explicit installer choice. At the target-disk screen, Broadcom documents three materially different actions:

- **Upgrade ESXi, preserve VMFS datastore** preserves settings and VMFS;
- **Install ESXi, preserve VMFS datastore** reinstalls ESXi and keeps VMFS but loses host settings; and
- **Install ESXi, overwrite VMFS datastore** erases the ESXi installation and VMFS data.

Read the detected disk and option twice before confirming. Cancel if the installer says VMFS cannot be preserved or does not identify the expected ESXi installation.

For a supported offline-bundle update, upload the exact ZIP to a datastore folder, list its profiles, and run a dry run:

```bash
esxcli software sources profile list \
  -d /vmfs/volumes/LocalDatastore/updates/offline-bundle.zip

esxcli software profile update --dry-run \
  -d /vmfs/volumes/LocalDatastore/updates/offline-bundle.zip \
  -p Exact-OEM-Profile-Name
```

Resolve every compatibility or acceptance error. Then apply the same `software profile update` without `--dry-run` and reboot only when the result requests it. Broadcom says profile `update` is the safer routine action because it preserves newer or third-party packages unless superseded. Profile `install` strictly matches the target and can remove OEM components.

Starting with ESXi 8.0 Update 2, Broadcom says `esxcli software vib update` and `vib install` are no longer supported for host updating. Use an image-profile workflow.

## Do Not Combine Firmware Experiments with the Upgrade

If firmware must change to support the target, use the vendor's tested sequence and exact driver-firmware pairing. Avoid upgrading BIOS, RAID, NIC firmware, storage driver, and ESXi in one opaque action unless the OEM bundle is designed and supported as a unit.

Preserve a known-good boot option and controller configuration. A RAID controller mode reset can hide the local datastore even when the VMFS data remains.

## Validate Before Powering On VMs

After boot, keep the host in maintenance mode and verify:

```bash
vmware -vl
esxcli software profile get
esxcli storage filesystem list
esxcli network nic list
```

Check:

- expected ESXi build and image profile;
- local datastore mounts with the original UUID and capacity;
- controller, disks, and RAID health;
- management VLAN, DNS, gateway, and NTP;
- every physical NIC and port group;
- syslog and coredump targets;
- no unsupported VIB or driver-firmware mismatch; and
- no storage or filesystem errors in logs.

Do not create a new datastore if the old one is missing. Stop and troubleshoot device, driver, partition, and mount state.

If VM inventory is absent but VMFS is intact, register each VM through Datastore Browser by selecting its `.vmx` file. Do not create replacement VMs with empty disks over the existing folders.

## Restore Service in Order

Exit maintenance mode only after infrastructure checks pass. Start one low-risk VM and validate console, guest networking, storage I/O, time, and backup integration. Then start infrastructure and application tiers in documented dependency order.

For each workload, test the application and newest expected data. Verify no snapshot or consolidation warning exists and run a controlled backup. Retain the previous installer and configuration bundle until the upgrade has passed its observation period.

If boot, storage, or networking is not stable, use the prepared rollback or reinstall plan rather than improvising on the only copy of local data.

## Official Documentation

- [How to preserve VMFS while upgrading or installing ESXi](https://knowledge.broadcom.com/external/article/392956/how-to-preserve-vmfs-datastore-while-upg.html)
- [How to back up and restore ESXi host configuration](https://knowledge.broadcom.com/external/article/313510/how-to-back-up-and-restore-the-esxi-host.html)
- [Upgrade an ESXi host with an offline ZIP bundle](https://knowledge.broadcom.com/external/article/343425/upgrade-a-host-with-offline-zip-bundle.html)
- [Upgrade or patch ESXi with esxcli](https://knowledge.broadcom.com/external/article/390985/upgrading-updating-or-applying-a-patch-t.html)
- [Local storage prevents host evacuation for an upgrade](https://knowledge.broadcom.com/external/article/430766/error-unable-to-access-the-virtual-machi.html)
- [Determining network and storage firmware and driver versions](https://knowledge.broadcom.com/external/article/323110/determining-networkstorage-firmware-and.html)

## Conclusion

A local-only standalone upgrade is an outage with a data-preservation decision at its center. Put recoverable VM copies and host configuration off the server, verify the OEM image and hardware pairing, power down cleanly, and select the preserve-VMFS path deliberately. Validate datastore and network state before starting even one production VM.
