# Find Which ESXi Host or Backup Proxy Owns a VMDK Lock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, VMFS, VSAN, VMDK Lock, Backup Proxy, HotAdd, Troubleshooting

Description: Trace a VMDK lock from the failed task to its ESXi host, process, or hot-add backup proxy without releasing a legitimate writer.

---

A VMDK lock is useful evidence. It can identify the host running a VM, a backup proxy reading a disk, or a stale process left after a failed operation. The lock should not be removed until its owner and purpose are known because ESXi uses locking to prevent simultaneous writers from corrupting a virtual disk.

This runbook begins with the file named in the error, follows ownership to a host and process, and then correlates that process with vCenter and the backup platform. It treats standard VMFS VMDKs and vSAN separately because a standard VMFS VMDK has a flat, delta, or SEsparse extent, while a vSAN virtual disk is an object rather than a conventional `-flat.vmdk` file.

## Start with the Exact Failed Object

Copy the complete error from **VM > Monitor > Tasks and Events > Tasks**. Broadcom notes that ESXi 8.0 Update 2 and later can show the file-lock owner in this view. Preserve the object path even if the UI already supplies a host name.

Typical errors include:

```text
Failed to lock the file.
One or more disks are busy.
Cannot open the disk '/vmfs/volumes/Datastore/VM/VM-000004.vmdk'
or one of the snapshot disks it depends on.
```

Do not reduce that path to `VM.vmdk`. The reported object might be the active snapshot descriptor, a delta or SEsparse extent, a base extent, or a vSAN lock object. A VM can have several disks with different owners during backup cleanup.

Record:

- VM name, MoRef or instance UUID, power state, and expected host;
- datastore type and UUID;
- exact disk path and controller slot;
- failed task time and operation ID when present;
- current and recent backup jobs; and
- recent HA, vMotion, storage, or host-disconnect events.

Pause new backup and snapshot work for the VM while investigating.

## Establish the Expected Owner

A powered-on VM legitimately holds an exclusive lock on its active disk and configuration. A base extent beneath a snapshot can have a read-only lock. Multi-writer disks intentionally use a different lock mode. Therefore, a lock on the host running the VM is not automatically a fault.

Confirm the VM's actual location in vCenter and directly in the Host Client when management state is uncertain. A read-only inventory check on a host is:

```bash
vim-cmd vmsvc/getallvms
```

If an isolated source host might still run the VM, do not power on another copy. Fence the old host according to the HA and storage design before changing ownership. Inventory status alone is not fencing.

For a powered-off VM, no VMX process should normally hold its ordinary files. A powered-off VM with a persistent lock is the clearest stale-owner candidate, but backup, replication, and clustered-disk configurations must still be excluded.

## Resolve a VMFS Lock to a Host

Run `vmfsfilelockinfo` from an ESXi host that can access the VMFS datastore. Quote paths containing spaces:

```bash
vmfsfilelockinfo -p '/vmfs/volumes/DatastoreName/VMFolder/Disk-flat.vmdk'
```

Preserve the exact path in the error, then use the applicable Broadcom procedure to select the file to test. For a VMFS disk, that normally means following the descriptor to the corresponding `-flat`, `-delta`, or `-sesparse` extent; inspect the descriptor itself when the error or datastore-specific procedure identifies it as the locked object. The output can report a lock mode, a MAC address, and, when Fault Domain Manager can resolve it, the owning host name.

Lock modes commonly encountered in Broadcom's lock guidance are:

- exclusive for a currently used disk, VMX, or swap file;
- read-only for a parent disk or a disk attached to a backup proxy; and
- multi-writer for an intentionally shared-disk configuration.

Map the reported MAC address to the host inventory. Check all relevant VMkernel and physical adapter MAC addresses rather than assuming it is the management address. Preserve the raw output in the incident record.

The older diagnostic command below can expose VMFS heartbeat lock detail, but its output is lower level and easy to misinterpret:

```bash
vmkfstools -D '/vmfs/volumes/DatastoreName/VMFolder/Disk-flat.vmdk'
```

Prefer `vmfsfilelockinfo` for ownership. Use `vmkfstools -D` only as corroboration under the Broadcom lock procedure.

## Identify the Process on the Owner Host

Connect to the host reported as owner and search for the exact file or a specific VM identifier:

```bash
lsof | grep -F 'Disk-flat.vmdk'
ps | grep -i 'VMName'
```

Broad matches can identify the wrong workload, especially when VM names share prefixes. Correlate the process or world ID with the full path, registered VM, and task time.

Interpret the result:

- the VMX world for the powered-on source VM is expected;
- a proxy VMX world with the source VMDK attached points to hot-add cleanup;
- `hostd-worker` can reflect an incomplete management or NBD operation;
- a shell utility can itself hold a vSAN descriptor open; and
- no process plus a persistent lock after a host failure suggests stale host ownership.

Do not kill a process merely because its ID appears. Broadcom's vSAN lock procedure warns that termination must occur only on a host where the VM is not registered, and only after the process impact is verified. A mistaken VMX kill is an unplanned VM outage.

## Find a Hot-Add Backup Proxy

In hot-add transport, the backup platform attaches a source disk to a proxy VM so the proxy can read it. An interrupted job can leave that disk attached. NBD workflows can also leave a disk handle open without a visible hot-add disk, so inspect both vCenter and the backup logs.

For every proxy eligible for the failed job:

1. Open **Edit Settings**.
2. Expand every hard disk.
3. Compare its complete datastore path with the locked source path.
4. Check the backup console for an active, retrying, or orphaned session.
5. Confirm with the backup owner that the session is finished.
6. Remove the stranded disk with **Remove from virtual machine**.

Never select **Delete files from datastore**. That is the production VM's data. Schedule the change outside active backup windows so an expected attachment is not mistaken for a stranded one.

If the UI cannot remove the disk because the proxy itself is in an invalid state, stop and follow the backup-vendor and Broadcom procedure for that exact condition. Direct `.vmx` editing is not the normal cleanup path.

## Use the vSAN Lock Workflow for vSAN

Do not look for `Disk-flat.vmdk` on vSAN. The virtual disk payload is a vSAN object, and the namespace contains descriptors and hidden lock objects. Broadcom's vSAN article starts by checking for a disk still mounted to a proxy and explicitly says not to delete it from disk.

From the VM namespace, the documented inspection pattern can enumerate lock state:

```bash
for file in *; do
  echo "${file}"
  vmfsfilelockinfo -p "${file}" | grep -i mode
done

for file in .*lck; do
  echo "${file}"
  vmfsfilelockinfo -p "${file}" | grep -i mode
done
```

Run only in the verified VM namespace and treat the output as inspection. The second loop checks hidden `.<uuid>.lck` objects. Resolve the MAC to the vSAN host, then use `lsof` with the namespace UUID or exact lock object on that host.

Do not inflate a vSAN VMDK directly from a host or manipulate its backing object with flat-file VMFS steps. Use only a vSAN-specific Broadcom procedure for copying, deleting, or editing a descriptor. If the object reports multiple faults, use vSAN health and object diagnostics and contact Broadcom Support.

## Choose the Correct Release Action

Release the lock through its cause:

| Owner | Safe next action |
| --- | --- |
| Powered-on source VM | Leave the lock; correct inventory or operate on the right host |
| Active backup proxy | Let the job finish or stop it through the backup product |
| Stranded hot-add disk | Detach from the proxy without deleting files |
| Open NBD or hostd session | Use the vendor and Broadcom procedure for the specific stale session |
| Duplicate registration | Prove only one VM is running, then unregister the duplicate |
| Isolated host | Fence it before another host writes the disk |
| Stale process | End only the precisely identified non-owner process under the documented procedure |
| Persistent host lock with no safe release | Evacuate or shut down VMs, collect logs, then perform a controlled reboot |

Restarting `hostd` or `vpxa` normally does not change VM power state, but it disrupts management, can affect current tasks and guest performance, and can cause instability that requires a reboot. It should be a targeted remediation, not a harmless probe. A host reboot is last resort and requires workload evacuation or coordinated outage.

## Verify Release and Repair the Workflow

Re-run the same lock command after cleanup. For a powered-off VM, the unexpected owner should be gone. Verify snapshot-chain consistency and datastore health before retrying power-on or consolidation.

Retry once, then inspect the new error. A chain can contain more than one locked object, so the reported path can change. After recovery:

- validate the VM and application;
- consolidate only if the chain is healthy and adequately provisioned;
- confirm the proxy has no source disks attached;
- run a controlled backup and verify automatic detach; and
- give the backup vendor the VDDK logs when cleanup repeatedly fails.

## Official Documentation

- [Investigating virtual machine file locks on ESXi](https://knowledge.broadcom.com/external/article/314365/investigating-virtual-machine-file-locks.html)
- [Investigating virtual disk file locks on vSAN](https://knowledge.broadcom.com/external/article/326800/investigating-virtual-disk-file-locks-on.html)
- [Stale VMDK locks left by third-party backup solutions](https://knowledge.broadcom.com/external/article/416996/stale-file-locks-on-vmdks-left-by-3rd-pa.html)
- [VMware virtual machine file lock on VMFS](https://knowledge.broadcom.com/external/article/313833/vmware-virtual-machine-file-lock-on-vmfs.html)
- [Failed to detach disks during hot-add backup operations](https://knowledge.broadcom.com/external/article/428126/failed-to-detach-disks-during-hotadd-bac.html)

## Conclusion

Lock ownership is a chain of evidence: failed file, lock mode, MAC address, host, process, and workflow. Resolve each link before releasing anything. A legitimate VM lock remains in place; a stranded backup attachment is removed from the proxy without deleting data; ambiguous vSAN or stale-host cases belong in the datastore-specific support workflow.
