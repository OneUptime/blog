# ESXi VM Won’t Power On: Troubleshoot Failed to Lock the File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, VMDK, File Lock, VMFS, VSAN, Backup, Troubleshooting

Description: Restore an ESXi VM that cannot power on by identifying the exact locked file and its legitimate owner before releasing anything.

---

**Failed to lock the file** means ESXi could not obtain the required lock on a VM file. It does not automatically mean the lock is stale. A running VM should lock its configuration, swap, and active disk files, and a backup proxy can legitimately hold read-only locks during an active job.

The incident becomes actionable when the VM is powered off but a different host or process still owns a lock, a backup hot-add disk was not detached, two inventory objects point to the same files, or storage failed before ownership was released. The safe workflow is to identify the exact file, the lock mode, the owning host or world, and the task that created it.

## Preserve the Exact Error

Copy the full power-on error from Tasks and Events. The useful part is normally the first path named after messages such as:

```text
Cannot open the disk '/vmfs/volumes/Datastore/VM/VM-000002.vmdk'
or one of the snapshot disks it depends on.
Failed to lock the file.
```

The locked object might be a `.vmx`, `.vswp`, base extent, snapshot descriptor, delta extent, change-tracking file, or vSAN object. Do not test a convenient file and assume its result applies to the chain.

Record the VM's expected host, power state, datastore, recent vMotion or HA event, backup job, snapshot task, and any storage interruption. Pause backup and replication jobs for that VM while investigating.

## Rule Out Legitimate Ownership

Check vCenter and, when vCenter state is uncertain, connect directly to every ESXi Host Client that can access the datastore. Confirm that the VM is not running or registered as powered on elsewhere. A vCenter object marked disconnected or inaccessible does not prove that its VMX process stopped.

Use the supported inventory to identify registrations. A read-only host command can corroborate them:

```bash
vim-cmd vmsvc/getallvms
```

Also check whether a similarly named duplicate VM was registered from the same `.vmx` file. If an old host is isolated but might still be running the VM, power it off or fence it from the shared storage according to the cluster's recovery procedure before powering on another copy. Two writers against one virtual disk can corrupt it.

If vSphere HA recently restarted the VM, allow inventory and storage ownership to settle and check the HA event. Do not remove lock artifacts merely to make a second power-on attempt proceed.

## Inspect Backup Proxy Attachments

Snapshot-based backup products commonly attach a target VM's disk to a proxy in hot-add mode. If a job fails before cleanup, the proxy can retain the target VMDK and its read-only lock.

Inspect every proxy VM that could serve the job:

1. Open **Edit Settings** for the proxy.
2. Expand every hard disk and compare the complete datastore path with the error.
3. Confirm in the backup console that no job is running or retrying.
4. If the attachment is stranded, choose **Remove from virtual machine**.
5. Never choose **Delete files from datastore** for the target VM's disk.

Coordinate this with the backup vendor. Detaching a disk that an active job is reading can fail the backup or destabilize its snapshot workflow.

## Query a VMFS Lock

For VMFS, Broadcom documents `vmfsfilelockinfo` as the primary inspection tool. For a virtual disk, run it against the exact flat, delta, or sesparse backing file identified from the detailed error or logs:

```bash
vmfsfilelockinfo -p '/vmfs/volumes/DatastoreName/VMFolder/Disk-flat.vmdk'
```

If a high-level snapshot error names only a descriptor, use the descriptor and detailed logs to identify the corresponding `-delta.vmdk` or `-sesparse.vmdk` extent as directed by the relevant KB. To have the utility use vCenter to map the owner, append `-v <vCenter_IP_or_FQDN> -u <SSO_user>`. The result can include the lock mode and MAC address of the owning host. Map that MAC address to an ESXi host through the vCenter lookup or the host's networking information rather than guessing from host names.

On the reported owner, inspect open files for the VM name:

```bash
lsof | grep -i 'VMName'
```

Use a sufficiently specific name or datastore path to avoid matching an unrelated VM. A lock held by the intended VMX world on the host actually running the VM is normal. A read-only lock belonging to a backup proxy can be normal during a job. A lock on a powered-off VM with no corresponding process is the stale-lock case.

Do not apply VMFS lock commands to vSAN as if vSAN were a directory of ordinary flat files. Use Broadcom's vSAN virtual-disk lock procedure, which resolves the object and lock owner through vSAN-aware tooling.

## Check the Snapshot Chain Before Changing Ownership

The error may name a snapshot disk because a parent is missing, inaccessible, or already held by another process. In Edit Settings, record the active backing for every disk. On VMFS, the VMX file provides a read-only cross-check:

```bash
grep -i '\.vmdk' '/vmfs/volumes/DatastoreName/VMFolder/VMName.vmx'
```

If the active backing is a delta, preserve every descriptor and extent. With the VM powered off, a consistency check can diagnose the chain when a Broadcom KB calls for it:

```bash
vmkfstools -e /vmfs/volumes/DatastoreName/VMFolder/VMName-000002.vmdk
```

An invalid chain is not fixed by deleting `.lck` entries or attaching the base disk. Stop and collect a support bundle. Powering on from an older parent can silently discard newer writes.

## Check Storage and Host State

File-lock errors can be downstream symptoms of APD, a host crash, a storage network outage, or an evicted VMFS volume. Confirm that the datastore is mounted and all required paths are healthy. Review `/var/run/log/vmkernel.log`, `/var/run/log/hostd.log`, and the VM's `vmware.log` around the failure time.

If multiple VMs on one datastore show lock or consolidation failures together, resolve the shared storage incident first. Repeated power-on attempts add noise and can create conflicting management tasks.

Generate a support bundle before a reboot when possible:

```bash
vm-support -w /vmfs/volumes/HealthyDatastore
```

Choose a healthy destination with adequate space. Support bundles can contain sensitive configuration and logs, so handle them as incident data.

## Release the Cause Through Its Owner

Use the smallest supported action:

- **Active backup attachment:** stop or complete the job, then detach the disk from the proxy without deleting storage.
- **Duplicate registration:** keep the correct inventory object and unregister the duplicate after proving neither copy is running.
- **Live VM on another host:** do not release the lock; correct inventory or cluster communication.
- **Management process known to hold a stale lock:** follow the exact Broadcom KB for that process and version. A controlled `hostd` or `vpxa` restart may be prescribed for specific cases.
- **Stale host ownership after failure:** evacuate or shut down workloads and use a controlled host reboot only when ownership cannot be cleared safely another way.
- **vSAN object lock:** follow the vSAN-specific procedure or Broadcom Support direction.

Never delete `.lck` files or directories indiscriminately. Lock representation differs by datastore type and ESXi version, and the visible artifact may not be the source of ownership. Never kill a VMX world unless the VM is confirmed unresponsive, its identity is exact, and the supported unresponsive-VM escalation procedure calls for it.

## Retry in a Controlled Order

After the unexpected owner has released the file:

1. Re-run the lock query and confirm the result is expected for a powered-off VM.
2. Verify the snapshot chain and datastore health.
3. Clear or wait for obsolete vCenter tasks.
4. Retry power-on once.
5. Watch Tasks and Events, `vmware.log`, `hostd.log`, and storage health.

If power-on succeeds, validate the guest filesystem and application. A lock incident caused by a failed backup can coexist with a consolidation-needed warning; clear that warning only after checking space and chain health.

If the same error returns, compare the new path and owner. It may be a second locked disk rather than a failed release. Do not escalate from inspection to deletion just because the first attempt did not work.

## Prevent Another Lock Incident

Monitor backup jobs for snapshot-removal and hot-add cleanup failures. Alert on unexpected disks attached to proxy VMs, consolidation-needed events, repeated VM power-on errors, APD or PDL events, and hosts that remain isolated while retaining datastore access.

Use supported fencing and HA designs so an isolated host cannot remain an ambiguous writer. Keep storage paths redundant and driver-firmware combinations supported. Test backup-proxy cleanup and incident escalation with the backup vendor.

## Official Documentation

- [Investigating virtual machine file locks on ESXi hosts](https://knowledge.broadcom.com/external/article/314365/investigating-virtual-machine-file-locks.html)
- [VMware virtual machine file lock on a VMFS datastore](https://knowledge.broadcom.com/external/article/313833/vmware-virtual-machine-file-lock-on-vmfs.html)
- [Error: Failed to lock the file during disk consolidation](https://knowledge.broadcom.com/external/article/381876/error-failed-to-lock-the-file-during-di.html)
- [Snapshot consolidation failure due to a file lock](https://knowledge.broadcom.com/external/article/374141/snapshot-consolidation-failure-failed-to.html)
- [Unable to enumerate all disks due to a lock on vSAN](https://knowledge.broadcom.com/external/article/418516/error-unable-to-enumerate-all-disks-fail.html)
- [Best practices for using VMware snapshots](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html)

## Conclusion

A file lock protects a VM from concurrent writers, so ownership must be proved before it is changed. Find the exact locked object, distinguish a live VM or backup lock from stale ownership, and release it through the owning workflow. Reboots, process termination, and manual lock cleanup are last-resort actions, not diagnostic tests.
