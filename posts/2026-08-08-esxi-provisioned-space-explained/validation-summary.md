# Validation Summary: Why Does ESXi Show More Provisioned Space Than Your VMs Actually Use?

## Status
validated

## Post Type
Technical guide / Capacity-planning reference

## Technologies Covered
- VMware ESXi and vCenter Server
- vSphere datastores and storage-capacity counters
- VMFS and NFS datastores
- Thin- and thick-provisioned VMDKs
- Virtual machine snapshots, delta disks, and consolidation
- Virtual machine swap and memory-state files
- Guest discard and SCSI UNMAP space reclamation
- VMware vSAN storage policies and capacity reporting
- VMware vSphere Virtual Volumes (vVols) and VASA
- External storage-array thin provisioning, compression, and deduplication

## Sources Consulted
- [Datastore / Virtual Machine Storage Capacity Counters](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/disk_storutil_counters.html) - official definitions of provisioned and used space and the VM file types included in storage counters.
- [ESXCLI Command Reference: storage](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html) - current syntax and behavior of `esxcli storage filesystem list`.
- [Using thin provisioned disks with virtual machines](https://knowledge.broadcom.com/external/article/337348/using-thin-provisioned-disks-with-virtua.html) - thin allocation, overcommitment, growth, and `du` versus apparent file size.
- [Types of supported Virtual Disks on ESXi hosts](https://knowledge.broadcom.com/external/article/308992/types-of-supported-virtual-disks-on-esxi.html) - VMFS thin, lazy-zeroed thick, and eager-zeroed thick allocation behavior.
- [Storage array space not reclaimed after Guest OS cleanup on VMFS](https://knowledge.broadcom.com/external/article/323112/storage-array-space-not-reclaimed-after.html) - guest discard, thin-VMDK requirements, VMFS5 manual UNMAP, and VMFS6 automatic reclamation.
- [Overview of virtual machine snapshots in vSphere](https://knowledge.broadcom.com/external/article/342618/overview-of-virtual-machine-snapshots-in.html) - delta chains, SEsparse files, maximum delta growth, memory-state files, and snapshot file placement.
- [Best practices for using VMware snapshots in the vSphere environment](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html) - API-created snapshot visibility, backup cleanup, chain safety, and the prohibition on expanding a VMDK while snapshots exist.
- [Snapshot files are present for a VM though Snapshot Manager does not show any](https://knowledge.broadcom.com/external/article/413101/snapshot-files-are-present-for-a-vm-thou.html) - hidden or orphaned backup snapshots and datastore-file checks.
- [Higher than expected datastore usage due to large VM swap files](https://knowledge.broadcom.com/external/article/342554/higher-than-expected-datastore-usage-due.html) - `.vswp` sizing from configured memory minus reservation.
- [Investigating Datastore usage](https://knowledge.broadcom.com/external/article/380937/investigating-datastore-usage.html) - supported `df` and `du` comparison and the distinction between allocated blocks, apparent file size, and filesystem metadata.
- [vSAN space reporting feature overview](https://knowledge.broadcom.com/external/article/315553/vsan-space-reporting-feature-overview.html) and [Storage space utilization calculation for VM objects on vSAN ESA](https://knowledge.broadcom.com/external/article/394410/storage-space-utilization-calculation-fo.html) - RAID, policy, reservation, metadata, and ESA overhead in vSAN capacity reporting.
- [Understanding Virtual Volumes (vVols)](https://knowledge.broadcom.com/external/article/323121/understanding-virtual-volumes-vvols-in-v.html) and [Description of Virtual Volume pie chart components in vCenter](https://knowledge.broadcom.com/external/article/397954) - VASA integration and native config, data, snapshot-memory, and swap virtual volumes.
- [Datastore usage is higher than shown on array](https://knowledge.broadcom.com/external/article/314355/datastore-usage-is-higher-than-shown-on.html) - why vCenter, the Host Client, and `df` can report more usage than an efficient external array.
- [Provisioned Space is higher than expected for non-persistent VDI VMs](https://knowledge.broadcom.com/external/article/435010/provisioned-space-is-higher-than-expecte.html) - hidden VDI replicas, redo layers, vSAN policy overhead, and power-state-dependent provisioned space.
- [VM provisioned and used storage show larger than allocated disk space](https://knowledge.broadcom.com/external/article/394729/vms-provisioned-storage-used-storage-sho.html) - snapshot growth and supported consolidation.
- [Reclaiming datastore space from a thin-provisioned vCenter Server Appliance](https://knowledge.broadcom.com/external/article/421301/reclaiming-datastore-space-from-thin-pro.html) - appliance-specific VMFS6 reclamation requirements. All six Broadcom Knowledge Base links in the post were opened and confirmed to match their link text and intended claims.

## Issues Found
1. **The reclamation path implied that every datastore, including vSAN, has a separate backing-array layer.** Changed the wording to refer to the datastore platform and a backing array only where applicable. This preserves the end-to-end discard/UNMAP requirement without imposing a VMFS-on-array topology on vSAN or vVols.
2. **The thick-disk statement was broader than its file-allocation semantics.** Scoped the up-front datastore-footprint explanation to VMFS. vSAN thick allocation is policy-driven through Object Space Reservation, and NFS thick support depends on the array and VAAI.
3. **The snapshot file check referred to one datastore folder.** Changed it to the relevant datastore folders because a VM can span datastores and snapshot delta descriptors and extents normally follow their parent virtual disks.
4. **The swap-file lifecycle and ISO wording were categorical.** Clarified that `.vswp` is normally removed at power-off, since stale files can remain after abnormal conditions, and limited the ISO claim to datastore-resident media because mounted media can come from other sources.
5. **The external-array visibility statement also encompassed vVols.** Scoped it to traditional VMFS or NFS datastores and changed “invisible” to “generally invisible”; vVols exchange array information through VASA.
6. **The `du` example omitted dot-prefixed entries and emitted recursive detail without a datastore total.** Replaced `du -h /vmfs/volumes/DatastoreName/*` with `du -sh "/vmfs/volumes/DatastoreName/"`. The quoted whole-directory path handles datastore names containing spaces, includes entries below the directory regardless of their leading character, and produces one allocated-block total suitable for comparison with `df`.

## Review Notes
- The remaining capacity-layer, thin-overcommitment, snapshot-growth, consolidation, swap-demand, vSAN, vVol, and external-array explanations agree with current Broadcom documentation.
- `du` is read-only but may take time and generate substantial read I/O on a large datastore. Its result can legitimately be lower than `df` because `df` includes whole-filesystem allocations and metadata.
- The post does not pin a vSphere release. Claims were checked against current documentation covering vSphere/ESXi 7.x and 8.x and, where Broadcom publishes it, current ESX/vCenter 9.x behavior. No command used in the post is deprecated in the current ESXCLI reference.
- The linked VCSA reclamation article is appliance-specific and should be treated as an example of reclamation requirements, not as a generic procedure for every guest operating system.
