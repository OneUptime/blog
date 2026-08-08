# Validation Summary: How Long Should You Keep an ESXi Snapshot Before It Becomes a Risk?

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- VMware vSphere and ESXi/ESX
- VMware virtual machine snapshots
- VMFS redo-log snapshots and VMDK delta chains
- Native snapshots on vVols, NFS with VAAI, and vSAN ESA
- vSphere snapshot deletion and consolidation
- Datastore and vSAN capacity planning
- Backup proxy and VADP snapshot workflows
- PowerCLI, VMware Aria Operations, and ESXi shell monitoring

## Sources Consulted
- Broadcom, Best practices for using VMware snapshots in the vSphere environment: https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html
- Broadcom, Guidance on using snapshots for database virtual machines in vCenter Server: https://knowledge.broadcom.com/external/article/426571/guidance-on-using-snapshots-for-database.html
- Broadcom, Recommendations for creating a snapshot for a large virtual machine: https://knowledge.broadcom.com/external/article/418600/recommendations-for-creating-a-snapshot.html
- Broadcom, FAQ: Delete all Snapshots and Consolidate Snapshots Feature: https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html
- Broadcom, How to calculate current snapshot size, estimate consolidation times, and understand performance factors: https://knowledge.broadcom.com/external/article/316414/how-to-calculate-snapshot-consolidation.html
- Broadcom, Undetected Snapshots in Snapshot Manager and Snapshot Chain: https://knowledge.broadcom.com/external/article/316545/undetected-snapshots-in-snapshot-manager.html
- Broadcom, Overview of virtual machine snapshots in vSphere: https://knowledge.broadcom.com/external/article/342618/overview-of-virtual-machine-snapshots-in.html
- Broadcom, Understanding virtual machine snapshots within Virtual Volumes (vVols): https://knowledge.broadcom.com/external/article/341651/understanding-virtual-machine-snapshots.html
- Broadcom, Estimate the time required to consolidate virtual machine snapshots: https://knowledge.broadcom.com/external/article/338534/estimate-the-time-required-to-consolidat.html
- Broadcom, Determining Progress of Long running Snapshot Operations and Cancelling Them: https://knowledge.broadcom.com/external/article/383242/determining-progress-of-long-running-sna.html
- Broadcom, Creating snapshots in a different location than the default virtual machine directory: https://knowledge.broadcom.com/external/article/314378/creating-snapshots-in-a-different-locati.html
- Broadcom, Snapshot consolidation continues to run for a very long time: https://knowledge.broadcom.com/external/article/400300/snapshot-consolidation-continues-to-run.html
- Broadcom, Snapshot removal stops a virtual machine for long time: https://knowledge.broadcom.com/external/article/323397/snapshot-removal-stops-a-virtual-machine.html
- Broadcom, Snapshot consolidation fails due to locks held by third-party backup software: https://knowledge.broadcom.com/external/article/321365/failed-to-lock-the-file-or-one-or-more-d.html
- Broadcom, vSAN Health Service - Capacity utilization - Storage space: https://knowledge.broadcom.com/external/article?legacyId=71003

## Issues Found
1. The datastore-capacity instruction covered only datastores holding VM disks. ESXi can redirect snapshot redo logs to a configured working directory on another datastore, and a memory snapshot also creates a `.vmsn` state file. The post now includes custom snapshot working directories and memory-state space in capacity planning.
2. The delta-growth formula used exact equality and treated changed blocks as globally unique. Sparse-disk allocation and metadata add overhead, and the same logical region can be present in multiple deltas. The formula is now explicitly approximate and per-delta, with chain duplication called out.
3. The 20 to 30 percent reserve did not state its denominator. The post now identifies Broadcom's stated basis: the VM's total virtual-disk size.
4. Snapshot deletion was described universally as committing delta changes. Native snapshot backends such as vVols, NFS with VAAI, and vSAN ESA do not use the same redo-log commit behavior. The post now scopes delta commits and increasing removal difficulty to traditional/non-native snapshots.
5. The blanket instruction never to cancel a running deletion or consolidation was outdated for ESX 9. The post now preserves the no-cancel rule for ESXi 8.x and earlier while documenting ESX 9's supported cancel action and resumable powered-off consolidation. It continues to warn against forcing a stop by restarting services or the host.
6. The active-leaf cloning recommendation did not require the VM to be powered off and referred to only one leaf. The post now distinguishes a supported vCenter VM clone from disk-level recovery, requires power-off for active-leaf VMDK cloning, and covers every current disk required by a multi-disk VM.

## Review Notes
- Broadcom's current general snapshot best-practices article covers ESXi/ESX and vCenter 8.x/9.x; the database guidance covers vCenter 7.x through 9.x. The post does not assert compatibility with a specific older release.
- The 20 to 30 percent figure is creation-planning guidance for large VMs, not a worst-case snapshot bound or a guarantee of sufficient consolidation space. The post states this distinction correctly.
- The VMFS redo-log explanation is intentionally storage-specific. vVols, NFS with VAAI, and vSAN ESA use native snapshot behavior with different read and deletion characteristics.
- All six Broadcom URLs in the post resolved successfully to the intended official articles during validation.
