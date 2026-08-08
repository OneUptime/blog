# How to Move an ESXi VM Between Isolated Hosts Without vMotion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, VM Migration, OVF, VMDK, Isolated Hosts, Disaster Recovery

Description: Move a powered-off ESXi VM between hosts with no shared storage or vMotion while preserving a tested source copy and avoiding snapshot-chain damage.

---

Two ESXi hosts do not need vMotion or shared storage to exchange a virtual machine, but the move becomes a cold migration with downtime. The safest general method is to power the VM off, export it as OVF, deploy it on the destination, and keep the source untouched until the imported VM passes validation.

A manual file transfer is possible when OVF is impractical, but it needs more care. A VMDK is not always one independent file: snapshots form a parent-child chain, disks can live outside the VM home directory, and device mappings can depend on the source host. Treat a manual move as a controlled clone, not as a folder drag-and-drop.

## Choose the Transfer Path Before the Outage

Use the first supported option that fits the environment:

1. **vCenter cold migration**, if one vCenter can manage both hosts. A powered-off compute-and-storage migration does not use live vMotion. Verify licensing and compatibility for the exact release.
2. **OVF export and deployment**, if the hosts are independently managed but a workstation or transfer server can reach both management interfaces.
3. **A temporary datastore**, such as an approved NFS volume or portable storage that both hosts can access at different times.
4. **A disk clone with `vmkfstools`**, only when the supported inventory workflows cannot transport the VM and an administrator can account for every disk and device.

Do not begin by unregistering or deleting the source VM. Registration changes are not required for OVF export, and the source inventory entry is useful for rollback.

## Inventory Everything the VM Depends On

Record the VM's current configuration before changing it:

- guest OS and virtual hardware version;
- firmware mode, Secure Boot, vTPM, encryption, and key-provider dependencies;
- CPU, memory, reservations, latency sensitivity, and NUMA-related settings;
- every virtual disk, datastore path, controller type, and disk mode;
- snapshots and consolidation status;
- network adapter type, MAC policy, port group, VLAN, and distributed-switch use;
- mounted ISO images, client devices, serial devices, and shared folders;
- RDMs, PCI passthrough, SR-IOV, USB devices, and vendor appliances; and
- backup, replication, monitoring, licensing, and guest network identity.

The destination must support the VM's virtual hardware and guest OS. A powered-off move handles CPU-family differences more safely than a live migration, but it does not make unsupported virtual hardware, passthrough devices, or encrypted disks portable.

If the VM is attached to a vSphere Distributed Switch that the isolated destination cannot use, create and validate a destination standard-switch port group first. Broadcom's host-to-host move guidance explicitly calls for moving the VM from a distributed switch to a standard vSwitch before the documented disconnected-host workflow.

## Establish a Recoverable Source

Create and verify an independent backup. A source VM on the only copy of its local datastore is not a rollback plan if that datastore fails during the exercise.

Resolve snapshots through Snapshot Manager and complete any required consolidation while the VM is still on its known-good host. Broadcom recommends committing snapshots before manually relocating VM files. Do not delete delta files from Datastore Browser and do not edit descriptors to make an export look simpler.

Confirm sufficient free space on the source, transfer location, and destination. Export size is not necessarily the same as provisioned capacity, and thin disks can expand according to the destination format and policy.

Define the outage, validation owner, rollback cutoff, and maximum acceptable data gap. Stop application writes and take a final application-consistent backup before shutdown.

## Method 1: Export and Deploy OVF

This is the preferred independent-host workflow documented by Broadcom.

1. Shut down the guest from its operating system and confirm the VM is powered off.
2. In the source Host Client, select the VM and export an OVF template.
3. Preserve every downloaded component together. A typical OVF package contains an `.ovf` descriptor, one or more virtual disk files, and optionally a manifest.
4. Record file sizes and calculate checksums on the transfer system.
5. Connect directly to the destination Host Client and choose **Create/Register VM**, then **Deploy a virtual machine from an OVF or OVA file**.
6. Select the destination datastore, disk provisioning choice, and correct destination network mapping.
7. Review the summary before deployment and wait for the task to finish.

The vSphere Client exports multiple OVF files rather than a single OVA in current releases described by Broadcom. If a single archive is operationally useful, use the official OVF Tool to convert the exported OVF package to OVA. Conversion is packaging, not a backup validation step.

Compare destination file sizes and checksums with the transfer source where the workflow exposes the same files. Retain the original export until the migration is accepted.

## Method 2: Use a Temporary Datastore

A temporary NFS datastore can avoid downloading a large VM through a browser. Use storage that is supported by both ESXi versions and secured for the VM's data classification.

Power the VM off and consolidate it first. If vCenter can see both hosts and the workflow offers a cold clone or migration, use that UI operation. If the hosts must mount the temporary datastore separately, copy or clone to it while only the source is using the original VM, unmount it cleanly, present it to the destination, and register or clone the transferred VM there.

Do not present a portable VMFS device to two isolated hosts in an improvised way. Duplicate signatures, resignaturing, active registrations, and accidental simultaneous access can turn a transport shortcut into a storage incident. Follow the storage vendor and vSphere documentation for the actual device type.

## Method 3: Manually Clone Virtual Disks

Use this only for a powered-off VM and only after a verified backup. Broadcom recommends vSphere features ahead of manual operations and warns against ordinary `cp`, `mv`, or `scp` for virtual-disk storage operations. Use `vmkfstools -i` to create a consistent virtual-disk clone.

First identify the VM's registered configuration and every attached disk through the Host Client. Confirm Snapshot Manager is empty and consolidation is not required. If a snapshot chain intentionally remains, stop: selecting a base descriptor instead of the active leaf creates a stale copy. Do not guess the leaf from the largest sequence number.

For a simple consolidated disk, an example clone on a datastore already visible to the source host is:

```bash
vmkfstools -i \
  '/vmfs/volumes/SourceDS/AppVM/AppVM.vmdk' \
  '/vmfs/volumes/TransferDS/AppVM/AppVM.vmdk' \
  -d thin
```

The paths are examples, not placeholders to run unchanged. Create the destination directory first, quote paths, choose a provisioning format supported by the destination, and repeat for every virtual disk. Broadcom documents an additional vSAN-specific option for vSAN destinations; do not add storage flags by analogy.

Copy the powered-off VM's small configuration files through a supported datastore-file workflow, or create a new VM on the destination with matching firmware, controller, CPU, and memory settings and attach the cloned disks as existing disks. `vmkfstools -i` clones one disk only. It does not transfer the VMX configuration, NVRAM, vTPM state, encryption keys, ISO files, or other disks.

If the source uses a VMware Paravirtual SCSI controller, reproduce that controller type. Broadcom notes that a clone can otherwise be associated with a different default controller and fail to boot.

## Register Without Creating a Duplicate Writer

For a transferred VMX, use the destination Host Client:

1. Open **Storage** and select the destination datastore.
2. Choose **Register a VM**.
3. Browse to and select the transferred `.vmx` file.
4. Review its hardware while it remains powered off.

Broadcom also documents `vim-cmd solo/registervm` for registration, but the Host Client is easier to audit and is the preferred routine path. Registration does not validate disk-chain correctness or make missing external disks appear.

Never power on source and destination copies on the same network with the same identity. During the first boot, answer the moved-or-copied identity question according to the migration design. Broadcom's move procedure says to choose **I moved it** when preserving the existing UUID. A deliberate clone needs a new identity instead. Document the decision because UUID and MAC behavior affects licensing, DHCP, backup, and monitoring.

## Validate the Destination in Isolation

Initially connect the imported VM to an isolated test port group or leave its vNIC disconnected. Before boot, verify:

- every expected disk is present, on the intended controller and unit number;
- disk capacity and provisioning match the plan;
- firmware, Secure Boot, vTPM, and encryption requirements are satisfied;
- no source-only ISO, RDM, passthrough, or distributed-port reference remains; and
- the destination has capacity for swap, snapshots, and normal growth.

Power on and watch the console. Validate filesystem and application data, guest time, network configuration, services, database recovery, licensing, monitoring, and backup. Compare a known transaction or application-level checksum with the final source checkpoint.

Only connect the production network after confirming the source VM remains off. Update DNS, routing, firewall, backup, and monitoring records through their normal change processes.

## Roll Back Without Losing the Source

If validation fails, power off the destination VM and preserve its logs. Do not repeatedly alter disk descriptors or controllers until the symptom changes. Return production service to the untouched source if the rollback window permits, then diagnose the transfer copy.

Keep the source VM, export, and final backup until the destination has completed an agreed observation period and a successful new backup. When decommissioning the source, unregister it first and retain its datastore files according to the recovery policy. Delete source data only as a separate, explicitly approved action.

## Official Documentation

- [Moving a virtual machine between ESXi hosts with different processor types](https://knowledge.broadcom.com/external/article/320236)
- [Moving or copying a virtual machine within a VMware environment](https://knowledge.broadcom.com/external/article/317919)
- [Exporting a virtual machine as a single OVA file](https://knowledge.broadcom.com/external/article/373304)
- [Register a virtual machine to inventory](https://knowledge.broadcom.com/external/article/315281)
- [Cloning and converting virtual machine disks with vmkfstools](https://knowledge.broadcom.com/external/article/343140)
- [Snapshot best practices for ESXi](https://knowledge.broadcom.com/external/article/318825)

## Conclusion

An isolated-host move is safest as a powered-off OVF export and deployment. Inventory host-specific dependencies, consolidate through supported controls, preserve a verified source, map networking deliberately, and test the destination while isolated. Use manual disk cloning only when necessary, never as an excuse to copy an active or misunderstood snapshot chain.
