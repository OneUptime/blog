# How to Diagnose ESXi `No Space Left on Device` Errors in Ramdisks When VMFS Has Free Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, vSphere, Ramdisk, VisorFS, VMFS, Troubleshooting, Storage

Description: Distinguish a full ESXi ramdisk or file table from VMFS capacity, identify the owning files or service, and recover without deleting system data blindly.

---

An ESXi host can report `No space left on device` while every VMFS datastore still has ample free capacity. The message describes the filesystem that received the failed write, and much of the ESXi root filesystem is backed by small memory-resident ramdisks such as `root`, `var`, and `tmp`. Free space on a VMFS datastore cannot satisfy a write to one of those ramdisks.

The error can also mean that a ramdisk's file table is exhausted by a very large number of small files. In that case, byte usage alone may look less dramatic. Diagnose the exact path and resource before deleting anything.

This guide targets ESXi 7.x and 8.x. Product-specific ramdisks, including vSAN and NSX trace areas, must be handled with the KB for the installed product and version.

## Preserve Access and Evidence

A full `root`, `/var`, or `/tmp` ramdisk can disrupt hostd, vpxa, HA, vMotion, logging, patching, and support-bundle generation. If the host is becoming unresponsive, establish out-of-band console access and avoid starting additional operations that create temporary files.

Before cleanup, record:

- the exact error and pathname;
- the event time and affected operation;
- installed ESXi, OEM add-on, NSX, vSAN, and hardware-management versions;
- recent patches, support-bundle jobs, scripts, or third-party agent changes.

Do not immediately reboot. A reboot may clear temporary content and restore service, but it can erase the best evidence of the producer and allow the problem to recur.

## Separate VMFS Usage from Ramdisk Usage

Use both views:

```bash
df -h
vdf -h
```

`df -h` lists mounted filesystems, including VMFS and vFAT volumes. `vdf -h` reports ESXi ramdisk consumption. If `vdf` shows `tmp`, `var`, `root`, or another named ramdisk at or near 100%, the free space shown for an unrelated VMFS datastore is irrelevant to the failing write.

Correlate the named ramdisk and path from the ESXi logs:

```bash
grep -Ei "ramdisk|no space left|file table" /var/run/log/vobd.log /var/run/log/vmkernel.log | tail -n 100
```

Typical messages distinguish the failure:

- `The ramdisk 'tmp' is full` means byte capacity is exhausted.
- `The file table of the ramdisk 'var' is full` or an `inode table ... is full` message means too many filesystem objects have consumed the file table.
- A failed path under `/vmfs/volumes/<uuid>` points to a datastore or system volume instead of a ramdisk.
- A failure under `/tmp/stagebootbank` during an update can involve staging-memory pressure and should be matched to the ESXi release-specific patching KB.

## Find the Actual Consumer

Work inside the affected directory so that datastore and device mounts do not distort the result. For `/tmp`, Broadcom documents these ranking commands:

```bash
cd /tmp
du -a . | sort -n -r | head -n 20
ls -lSh /tmp | head -n 20
```

For `/var`, first inspect symlinks. A symlinked directory may redirect to persistent scratch and not consume the `var` ramdisk:

```bash
cd /var
ls -lh
du -sh *
vdu -ah
```

Then inspect the largest non-symlinked directory. To locate unexpectedly large files in that subtree:

```bash
find . -type f -size +10M
```

If the log says the file or inode table is full, also look for a directory containing thousands of small files:

```bash
find /tmp -type f | wc -l
find /var -type f | wc -l
```

Counts are diagnostic, not deletion criteria. Common patterns documented by Broadcom include stale patch artifacts in `/tmp`, runaway scripts creating `vim-cmd*.txt`, excessive SNMP trap files, a large locked `vmware-vmx-*.log`, and add-on logging or rotation failures. The filename, owner process, and timestamps should lead to a specific KB or vendor fix.

## Attribute the Files Before Removing Them

For a suspicious file or directory, answer four questions:

1. Which process or installed extension creates it?
2. Is the file still open or actively growing?
3. Is it diagnostic evidence that should be copied to a datastore first?
4. Does Broadcom or the add-on vendor document it as safe to remove?

Never recursively clear `/tmp`, `/var`, `/var/run`, `/var/lib`, or `/var/log`. These paths contain live sockets, state, locks, journals, and service data. Do not delete VMware Tools images from `/vmimages`, active logs, bootbank content, VIB metadata, or files merely because they are large.

If a confirmed obsolete artifact must be retained for analysis, copy it to a datastore with sufficient space before removal:

```bash
cp /tmp/<confirmed-obsolete-file> /vmfs/volumes/<datastore>/<case-directory>/
rm /tmp/<confirmed-obsolete-file>
```

Use explicit filenames. A shell glob or recursive deletion is too broad for emergency cleanup.

## Fix the Producer, Not Just the Symptom

Cleanup restores headroom; it does not correct the process that consumed it. Apply the remedy that matches the evidence:

- For stale files from a completed task, remove only the documented artifacts and correct the job's cleanup behavior.
- For a runaway VMware or partner service, use the service-specific Broadcom or vendor KB, then update to the fixed release when one is identified.
- For logs writing to a ramdisk because scratch or syslog is misconfigured, correct the persistent scratch/log target and verify log rotation.
- For a locked VMX log in `/tmp/vmware-root`, identify the VM from the log as Broadcom documents. Releasing that live lock can require a controlled VM power-off; deleting an open file is not a safe shortcut.
- For a product-specific ramdisk such as `vsantraces`, use the vSAN procedure. Do not treat it as generic `/tmp` cleanup.

When immediate recovery requires a reboot, place the host in maintenance mode first if possible. A reboot clears memory-backed temporary state but should be followed by version remediation and monitoring of the original producer.

## Verify Recovery

Re-run the same measurements after cleanup or service remediation:

```bash
vdf -h
df -h
```

Then verify the operation that originally failed, confirm the host remains connected in vCenter, and watch the relevant ramdisk rather than assuming the issue is resolved:

```bash
vdf -h | grep -E 'root|var|tmp'
```

Review new `vobd.log` and `vmkernel.log` entries for recurring full-ramdisk or file-table alarms. If usage continues to grow, stop repeated cleanup and escalate with the file list, timestamps, installed component versions, and the producer you identified.

## Rollback and Recovery Cautions

File deletion on ESXi is permanent. If the ownership or purpose of a file is unclear, preserve it and contact Broadcom Support. An accidental system-file deletion can require reinstallation.

Restarting all management agents can affect running tasks, HA behavior, and host connectivity. Follow Broadcom's management-agent procedure only after freeing enough space for services to create their normal state files. Do not use a host reboot as proof that a logging leak or defective add-on is fixed.

## Limitations and Version Scope

Ramdisk names and sizes vary with ESXi release, installed memory, and enabled products. The example thresholds and paths are diagnostic starting points, not quotas to enforce. ESXi 9.x, vSAN-specific trace exhaustion, NSX defects, and upgrade-time `stagebootbank` errors have separate current KBs and may require a fixed build rather than generic cleanup.

## Official Documentation

- [Checking ramdisk and disk usage on an ESXi host (Broadcom KB 318926)](https://knowledge.broadcom.com/external/article/318926/investigating-disk-space-on-an-esxi-host.html)
- [Identify and resolve full ESXi ramdisks (Broadcom KB 377985)](https://knowledge.broadcom.com/external/article/377985)
- [ESXi `/tmp` ramdisk at 100% (Broadcom KB 429012)](https://knowledge.broadcom.com/external/article/429012/esxi-ramdisk-tmp-is-100-full.html)
- [ESXi host RAM disk is full (Broadcom KB 316556)](https://knowledge.broadcom.com/external/article/316556)
- [ESXi ramdisk file table is full (Broadcom KB 376243)](https://knowledge.broadcom.com/external/article/376243)
- [Locked VM log fills an ESXi ramdisk (Broadcom KB 306892)](https://knowledge.broadcom.com/external/article/306892)

## Conclusion

`No space left on device` is a path-specific error, not a statement about every datastore. Compare `df` with `vdf`, use the log pathname to identify the affected ramdisk, find the responsible files or file count, and remediate their producer. Careful, explicit cleanup preserves evidence and avoids turning a recoverable ramdisk incident into host damage.
