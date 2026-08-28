# How to Clone a Thin-Provisioned VMDK with `vmkfstools` Without Inflating It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, VMDK, vmkfstools, Thin Provisioning, Virtual Machine

Description: Clone the correct VMDK descriptor with an explicit thin destination, handle snapshot chains safely, and verify the copy before changing a VM.

---

A thin VMDK has a logical capacity visible to the guest but allocates datastore blocks as data is written. A generic file copy can lose datastore-aware semantics or consume unexpected capacity. On ESXi, use `vmkfstools -i` and explicitly request a thin destination with `-d thin`.

The two most important choices are the source descriptor and the destination format. If snapshots exist, cloning the base descriptor can produce an old point in time. If `-d thin` is omitted, the destination can be created in a thick format depending on the command and datastore.

## Prepare a Consistent Source

The simplest supported procedure is an offline clone:

1. Take an application-consistent backup.
2. Power off the source VM cleanly.
3. Confirm that no backup, replication, snapshot, consolidation, or migration task is active.
4. Identify the source disk and its controller from **Edit Settings**.
5. Estimate destination capacity and growth headroom.

Broadcom's general `vmkfstools` cloning procedure requires the VM to be shut down because an in-use virtual disk is locked. Broadcom also documents, for ESXi and vCenter 8.x, a separate snapshot-based procedure for a crash-consistent copy of one dependent disk from a running VM. In that workflow, the target disk is on its base before the temporary snapshot; create the snapshot to redirect writes, then clone the now-unlocked base descriptor, not the new active snapshot leaf. Use that only when downtime is impossible and its crash-consistency semantics are acceptable.

## Select the Descriptor, Not the Data Extent

A VMFS virtual disk normally includes a small descriptor such as:

```text
app01.vmdk
```

and a data extent such as:

```text
app01-flat.vmdk
```

Pass the small descriptor to `vmkfstools -i`. Do not pass `-flat.vmdk`, `-delta.vmdk`, or `-sesparse.vmdk` directly.

Inspect the VM configuration and directory:

```bash
cd '/vmfs/volumes/SOURCE_DATASTORE/VM_DIRECTORY'

grep -n 'fileName = ' 'VM_NAME.vmx'
ls -lah *.vmdk
```

The VMX identifies the disk descriptor currently attached to each virtual controller. It does not by itself prove the latest point in a snapshot chain; snapshot metadata and descriptor parent links must also be consistent.

## Handle Snapshots Deliberately

If the VM has no snapshots and is powered off, the source is normally the base descriptor, for example `app01.vmdk`.

For an offline clone, if snapshots exist, the active state is represented by the latest descriptor in that disk's chain, such as `app01-000003.vmdk`. Broadcom explicitly warns that selecting the base descriptor in this case creates an outdated clone. Use the descriptor corresponding to the current snapshot leaf, not simply the lexically highest filename across unrelated disks.

Prefer consolidating or deleting snapshots through vSphere before the offline clone when the snapshot chain is healthy and the change window permits it. If you must clone a snapshot state, map the correct disk chain first and preserve all evidence. A guessed snapshot number is not a recovery procedure.

## Create a Destination Directory

For a VMFS or NFS datastore visible to the ESXi host, create a new, empty directory:

```bash
mkdir '/vmfs/volumes/DESTINATION_DATASTORE/app01-clone'
```

For a vSAN destination, create a namespace through the vSphere datastore browser or with Broadcom's documented `osfs-mkdir` utility; plain `mkdir` at the vSAN datastore root is not supported.

Use full paths and unique destination filenames. Ensure the destination can hold the currently allocated source data plus clone overhead and expected growth. Thin provisioning avoids preallocating the full logical capacity, but it does not compress used blocks and it does not make datastore overcommit safe.

## Clone Explicitly as Thin

For a powered-off base disk with no active snapshot:

```bash
vmkfstools -i \
  '/vmfs/volumes/SOURCE_DATASTORE/app01/app01.vmdk' \
  '/vmfs/volumes/DESTINATION_DATASTORE/app01-clone/app01-clone.vmdk' \
  -d thin
```

For an intentionally selected current snapshot leaf on a powered-off VM:

```bash
vmkfstools -i \
  '/vmfs/volumes/SOURCE_DATASTORE/app01/app01-000003.vmdk' \
  '/vmfs/volumes/DESTINATION_DATASTORE/app01-clone/app01-clone.vmdk' \
  -d thin
```

`vmkfstools` follows the descriptor chain and creates a standalone destination disk representing that selected state. The output should reach `Clone: 100% done` without an error.

When the destination is vSAN, use the documented `-W vsan` option. Omit it when the destination is VMFS or NFS, including when the source is vSAN, and confirm the release-specific syntax for the installed ESXi version.

## Do Not Use `cp` as a VMDK Conversion Tool

Commands such as this are unsafe as a general cloning method:

```bash
cp app01-flat.vmdk app01-clone-flat.vmdk
```

They bypass descriptor-chain interpretation and do not explicitly create a supported destination disk format. Copying only a descriptor does not copy the disk data or create an independent disk; copying only an extent produces no valid standalone descriptor. A sparse-aware filesystem copy also cannot decide which snapshot point the VM actually uses.

Use datastore-aware vSphere operations or `vmkfstools` for virtual disk cloning and conversion.

## Verify the Destination Before Attaching It

Inspect the new files:

```bash
cd '/vmfs/volumes/DESTINATION_DATASTORE/app01-clone'

ls -lah
grep -n -E '^(createType|RW |ddb\.(adapterType|thinProvisioned))' 'app01-clone.vmdk'
```

For a thin VMFS destination, the descriptor should normally contain `createType="vmfs"`, an `RW ... VMFS` extent, and `ddb.thinProvisioned = "1"`; `createType="vmfs"` alone does not distinguish thin from thick. The virtual extent should have the intended logical sector count. Confirm in the datastore and VM UI that the provisioned capacity is the original logical size while consumed capacity reflects the blocks copied into the thin destination. A fully allocated source can still produce a thin destination whose consumed capacity equals its provisioned capacity.

Then create an isolated test VM or add the disk as **Existing Hard Disk** to the intended powered-off VM. Before power-on:

- match the original virtual disk controller type unless you have verified that the guest supports the chosen alternative;
- avoid connecting a cloned boot disk to the same networked identity as the source;
- verify the expected partition table and filesystem from an isolated recovery environment;
- retain the source disk and backup unchanged.

Broadcom notes that cloned descriptor metadata can show LSI even when the source VM used VMware Paravirtual. The actual virtual SCSI controller is configured in **Edit Settings** or by `scsi#.virtualDev` in the VMX; use the source type or another type for which the guest has a boot driver. `ddb.adapterType` is deprecated legacy metadata and is not the authoritative VM controller setting.

## Understand What Was Not Cloned

`vmkfstools -i` clones one virtual disk. It does not clone:

- the VMX configuration;
- other disks in the VM;
- network identity;
- virtual TPM or encryption configuration;
- vCenter tags, policies, snapshots, or backup history.

To create a complete VM, use a supported clone, migration, backup, or restore workflow, or create a new VM configuration and attach each validated cloned disk. Copying a VMX and editing paths manually has additional identity and device-mapping risks.

## Clean Up Only After Validation

Do not delete or rename the source files to make room during the clone. After the destination has passed application and filesystem checks and a rollback window has elapsed, remove obsolete disks through a supported datastore or VM workflow. Confirm which descriptor owns which extent before deleting anything; manually deleting a `-flat`, `-delta`, or `-sesparse` extent can permanently destroy a disk chain.

If a live snapshot was created solely for cloning, remove it through Snapshot Manager after the clone and verify consolidation completed. Long-lived snapshots can grow and degrade performance.

## Official Documentation

- [Broadcom KB 343140: cloning and converting virtual disks with vmkfstools](https://knowledge.broadcom.com/external/article/343140/cloning-and-converting-virtual-machine-d.html)
- [Broadcom KB 309366: verifying a snapshot chain and cloning a virtual disk from snapshots](https://knowledge.broadcom.com/external/article/309366)
- [Broadcom KB 418614: clone one dependent VMDK from a running VM](https://knowledge.broadcom.com/external/article/418614/cloning-a-single-dependent-vmdk-from-a-r.html)
- [Broadcom KB 308992: supported ESXi virtual disk formats](https://knowledge.broadcom.com/external/article/308992/types-of-supported-virtual-disks-on-esxi.html)

## Conclusion

Use the VMDK descriptor that represents the required point in time, clone it with `vmkfstools -i ... -d thin`, and keep the source untouched until the destination is proven. Thin output preserves on-demand allocation, but snapshots, consistency, controller compatibility, and datastore headroom still require explicit checks.
