# Validation Summary: How Much Free Space Does ESXi Need to Consolidate a Snapshot?

## Status
validated

## Post Type
Technical guide / operational capacity-planning reference

## Technologies Covered
- VMware ESXi and vSphere snapshot management
- Snapshot Delete, Delete All, and Consolidate workflows
- VMFS, VMDK base disks, delta disks, and SESparse disks
- Thin- and thick-provisioned virtual disks
- Datastore capacity, VM swap (`.vswp`), and storage performance
- Consolidate Helper snapshots and active-leaf write growth
- vSAN and Virtual Volumes (vVols) storage semantics
- ESXi shell inspection with `grep` and `ls`

## Sources Consulted
- [KB 316414: How to calculate current snapshot size, estimate consolidation times, and understand performance factors](https://knowledge.broadcom.com/external/article/316414/how-to-calculate-snapshot-consolidation.html)
- [KB 398339: VM consolidation fails with “File too large” because of insufficient free space](https://knowledge.broadcom.com/external/article/398339/vm-consolidation-tasks-fail-with-the-err.html)
- [KB 341646: Troubleshooting virtual machine snapshot descriptor problems](https://knowledge.broadcom.com/external/article/341646/troubleshooting-virtual-machine-snapshot.html)
- [KB 371714: FAQ: Delete All Snapshots and Consolidate Snapshots Feature](https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html)
- [KB 418600: Recommendations for creating a snapshot for a large virtual machine](https://knowledge.broadcom.com/external/article/418600/recommendations-for-creating-a-snapshot.html)
- [KB 323397: Snapshot removal stops a virtual machine for a long time](https://knowledge.broadcom.com/external/article/323397/snapshot-removal-stops-a-virtual-machine.html)
- [KB 342618: Overview of virtual machine snapshots in vSphere](https://knowledge.broadcom.com/external/article/342618/overview-of-virtual-machine-snapshots-in.html)
- [KB 338534: Estimate the time required to consolidate virtual machine snapshots](https://knowledge.broadcom.com/external/article/338534/estimate-the-time-required-to-consolidat.html)
- [KB 341355: Snapshot removal task stops at 99%](https://knowledge.broadcom.com/external/article/341355/snapshot-removal-task-stops-at-99.html)
- [KB 342554: Higher than expected datastore usage due to large VM swap files](https://knowledge.broadcom.com/external/article/342554/all-guest-os-memory-reserved-when-disabl.html)
- [KB 337348: Using thin-provisioned disks with virtual machines](https://knowledge.broadcom.com/external/article/337348/using-thin-provisioned-disks-with-virtua.html)
- [KB 318856: Troubleshooting an ESXi datastore or VMFS volume that is full or near capacity](https://knowledge.broadcom.com/external/article/318856/troubleshooting-esxi-datastore-or-vmfs-v.html)
- [KB 414077: Datastore is full, need to free disk space](https://knowledge.broadcom.com/external/article/414077/datastore-is-full-need-to-free-disk-spac.html)
- [KB 326800: Investigating virtual disk file locks on vSAN](https://knowledge.broadcom.com/external/article/326800/investigating-virtual-disk-file-locks-on.html)
- [KB 341651: Understanding virtual machine snapshots within Virtual Volumes](https://knowledge.broadcom.com/external/article/341651/understanding-virtual-machine-snapshots.html)
- [KB 401070: Deprecation of vSphere Virtual Volumes in VCF 9.0 and VVF 9.0](https://knowledge.broadcom.com/external/article/401070/deprecation-of-vmware-vsphere-virtual-vo.html)

## Issues Found
- The powered-on capacity calculation labeled all incoming-write growth as helper-delta growth. Broadcom documents that deleting one non-current snapshot does not create an additional helper, although the VM's existing active leaf can continue growing. The section and budget now use the more general “online delta growth” term and distinguish active-leaf growth from helper-delta growth.
- The 1.5-times rule from KB 398339 lacked its documented version scope. The post now identifies it as guidance for the KB's ESXi 7.0.x and 8.0.x insufficient-space / **File too large** scenario.
- The KB 341646 attribution said the clone-or-commit requirement varies with “delta size.” The source says it varies with the size of the virtual snapshot disks and the amount of changes, so the post now uses the source's precise term.
- The 20-to-30-percent guidance did not identify its baseline or version scope. The post now states that KB 418600 is ESXi 7.x/8.x planning guidance to size datastore capacity for the total VM disk size plus another 20 to 30 percent of that size as free capacity, rather than a percentage that proves an existing consolidation is safe.
- The completion check required every disk to point to a base descriptor while also allowing intentionally retained snapshots. A VM retaining snapshots normally points to its active leaf. The post now checks for the descriptor appropriate to the chosen workflow: the base after a workflow that removes the full chain, or the intended active leaf when snapshots remain.

## Review Notes
- The two shell commands are syntactically valid on ESXi and are appropriate for read-only inspection. The warning that `ls` can show a sparse VMDK's apparent logical size rather than allocated blocks is correct.
- The 25 MB/s for four hours example equals approximately 360 GB in decimal units (about 335 GiB), so the arithmetic is correct.
- Broadcom confirms the post's central mechanics: a selected snapshot merges into its parent; Delete All reaches the base; a thin base can grow during commit; per-disk snapshot files are retained until that disk finishes; online consolidation can create a helper delta; and an active consolidation must not be interrupted.
- Broadcom also confirms that task progress can remain at 95 or 99 percent, that file timestamps and I/O are useful observational signals, and that datastore latency and concurrent I/O materially affect duration. For a powered-off VM, hostd performs the consolidation, so `vmware.log` may provide less progress detail than task state, file activity, or host logs.
- Snapshot deltas normally reside with their parent disks on ESXi 5.0 and later, but `snapshot.redoNotWithParent` can redirect them. The post's instruction to inventory the actual base and delta locations correctly accommodates that exception.
- vVols still have the object, array-offload, VASA, and SPBM semantics described in the post. Broadcom has deprecated vVol capabilities beginning with VCF 9.0 and VVF 9.0; vSphere 8.x receives critical-fix support through its support lifecycle.
- All six URLs in the post's **Official Documentation** section resolved to the intended Broadcom knowledge-base articles during validation.
