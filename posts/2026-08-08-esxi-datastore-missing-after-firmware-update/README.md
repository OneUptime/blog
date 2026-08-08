# ESXi Datastore Disappeared After Firmware Update: Driver, HCL, and LUN Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Datastore, Firmware, Storage Driver, HCL, HBA, LUN

Description: Trace a datastore lost after firmware or ESXi maintenance from adapter detection through supported driver-firmware pairing, paths, LUNs, and VMFS mounts.

---

When a datastore disappears immediately after server firmware, HBA firmware, or ESXi maintenance, do not recreate it. The data is usually behind a broken discovery layer: the controller is absent, its driver did not claim it, SAN or iSCSI connectivity is missing, the LUN is not presented, paths are down, or VMFS is not mounted.

Creating a new datastore on the same device initializes new filesystem metadata and can make recovery impossible. Preserve the device and partition state, compare against a working host, and move downward from hardware to filesystem.

## Stabilize the Host

Keep the affected host out of workload placement. If VMs on the missing datastore still run on another host, do not power-cycle or re-register them as a diagnostic test. Confirm backup status and open a change or incident record.

Capture:

- maintenance performed and exact timestamps;
- prior and current ESXi build;
- server BIOS, storage-controller, HBA, NIC, and disk firmware versions;
- image profile or OEM custom image used;
- datastore UUID, LUN NAA identifier, target IQN or WWPNs, and expected paths; and
- output from an otherwise identical working host.

Collect an ESXi support bundle before rolling back or installing a driver when the host is manageable.

## Identify the Missing Layer

Use the vSphere Client first: **Host > Configure > Storage Adapters**, **Storage Devices**, and **Datastores**. Then corroborate with read-only commands:

```bash
vmware -vl
esxcli storage core adapter list
esxcli storage core device list
esxcli storage core path list
esxcli storage filesystem list
```

Classify the result:

| Observation | Investigation layer |
| --- | --- |
| PCI device and HBA absent | BIOS, hardware, firmware, or unsupported adapter |
| PCI device present but no storage adapter | driver binding, image contents, driver-firmware support |
| Adapter present but target or LUN absent | SAN zoning, LUN masking, iSCSI network or discovery |
| Device present but every path down | fabric, array ports, network, credentials, multipathing |
| Device and paths present but no VMFS mount | snapshot LUN signature, mount state, partition or metadata issue |

This prevents a filesystem action from being applied to an HBA problem.

## Compare Adapter Enumeration

List PCI devices associated with VMkernel storage adapters:

```bash
vmkchdev -l | grep -i vmhba
```

For Fibre Channel, Broadcom uses this inventory command:

```bash
esxcli storage san fc list
```

If the adapter appeared before maintenance and is now absent, compare its vendor ID, device ID, sub-vendor ID, and sub-device ID with the Broadcom Compatibility Guide for the exact target ESXi release. A family name is not sufficient because different revisions can have different support.

Check the installed driver VIB only after identifying the driver name from the adapter and Compatibility Guide:

```bash
esxcli software vib list
```

Do not pipe to an assumed driver name from another host model. Record driver version and firmware as a pair. Broadcom's compatibility guidance is based on tested combinations, and an individually newer driver or firmware is not automatically supported with the other component.

## Check the Broadcom Compatibility Guide

Search the I/O Devices section with the full PCI IDs and select the exact ESXi release. Verify:

- adapter model and device revision;
- supported ESXi version and update;
- driver name, version, and type;
- corresponding firmware version; and
- any footnotes, OEM qualifications, or feature limits.

Also verify the server platform and storage array where applicable. Use an OEM-customized ESXi image when the server vendor requires it, and compare its add-ons with the image that previously worked.

Do not solve a mismatch by cycling through arbitrary driver VIBs. Plan one supported pair, obtain it from Broadcom or the hardware vendor as directed, validate its checksum, and retain a rollback path.

## Check SAN or iSCSI Presentation

If the adapter is present, compare identifiers and paths with a working host.

For Fibre Channel, verify:

- physical link and HBA port state;
- initiator WWPNs did not change;
- SAN zoning includes the correct initiator and targets;
- array host group and LUN masking include the current WWPNs; and
- redundant fabrics expose the expected number of paths.

For software iSCSI, verify:

- storage VMkernel ports, IP addresses, VLANs, MTU, and uplinks;
- routing to target portals from the intended VMkernel;
- static or dynamic discovery addresses;
- CHAP settings if used; and
- each target still maps the LUN to the initiator IQN.

A firmware update can reset HBA personality, boot mode, BIOS enablement, or port identity. Compare, do not assume the pre-change configuration survived.

## Rescan Only After Connectivity Is Correct

Use **Storage > Adapters > Rescan Storage** in the vSphere Client after the adapter, fabric, and presentation are healthy. The CLI equivalent documented in Broadcom recovery articles is:

```bash
esxcli storage core adapter rescan --all
```

Then repeat device, path, and filesystem inventory. Repeated rescans do not fix an unsupported driver or blocked VLAN and can add load while storage is unstable.

If a device appears as a snapshot LUN with an existing VMFS signature, stop and determine why its identity changed. Do not resignature or force-mount it without the vSphere storage procedure and an understanding of whether other hosts still use the original volume.

## Distinguish Local Storage Failures

For a local datastore, check the server management controller before ESXi changes:

- physical disk and RAID virtual-disk health;
- controller cache and battery state;
- backplane and cable alerts;
- controller mode and boot virtual-disk configuration; and
- offline hardware diagnostics.

Broadcom documents missing local datastores after ESXi 8.0 Update 3 when controller driver or firmware communication is incompatible. It also directs operators to validate the exact combination against the Compatibility Guide and engage the hardware vendor when certified software does not restore detection.

Do not initialize a degraded or foreign RAID set to make it visible. Import or recovery decisions belong to the server or controller vendor.

## Choose Rollback or Forward Repair

If the new ESXi image changed the driver and the previous bootbank is healthy, a documented ESXi rollback can be the fastest service restoration. Use it only when the update method supports rollback and after preserving logs. Do not roll back into an unsupported or end-of-support configuration as the permanent solution.

Forward repair means installing the exact supported async driver or applying the hardware-vendor firmware that matches the current driver. Broadcom's KB documents VIB or offline-bundle installation for specific missing-HBA cases, followed by a reboot. Treat that as a planned host change with workload evacuation, maintenance mode, verified package source, and console access.

Never install a storage driver while VMs depend solely on that host's local datastore without a tested backup and outage plan.

## Stop for Metadata Symptoms

If the device and paths are healthy but logs report VMFS corruption, a changed partition table, or a datastore missing after presentation to a non-ESXi system, do not format or create a new volume. Broadcom directs these cases to Support for vSphere On-disk Metadata Analyzer assessment. If other hosts can still read the datastore, protect those running VMs and migrate data away before recovery work.

## Validate Recovery

After the datastore returns:

- expected devices, paths, and multipathing policy are present;
- the original VMFS UUID mounts without resignaturing;
- all VMs and templates are inventoried correctly;
- no APD, PDL, SCSI, or filesystem errors recur;
- storage latency is normal under controlled load; and
- driver and firmware match the Compatibility Guide entry.

Test one canary host through the complete firmware and ESXi lifecycle before rolling the same combination across a cluster.

## Official Documentation

- [Datastores disappear after patching ESXi hosts](https://knowledge.broadcom.com/external/article/375516/datastores-disappear-after-patching-esxi.html)
- [ESXi host lost datastores after patching or upgrade](https://knowledge.broadcom.com/external/article/373287/esxi-host-lost-the-datastores-after-patc.html)
- [Local datastore missing after upgrading to ESXi 8.0 Update 3](https://knowledge.broadcom.com/external/article/439378/local-datastore-missing-after-upgrading.html)
- [Determining network and storage firmware and driver versions](https://knowledge.broadcom.com/external/article/323110/determining-networkstorage-firmware-and.html)
- [How to check which driver versions change after an ESXi upgrade](https://knowledge.broadcom.com/external/article/417176/how-to-check-which-driver-versions-will.html)
- [Datastore or LUN missing after reboot](https://knowledge.broadcom.com/external/article/409405/datastore-or-lun-missing-after-reboot.html)

## Conclusion

A post-update missing datastore is a layered discovery problem. Prove adapter support and driver-firmware pairing, then verify fabric, target, LUN, path, and mount state in order. Rescan only after connectivity is correct, and never create or resignature storage merely because the original datastore is temporarily absent.
