# Validation Summary: ESXi Snapshots vs Backups: What Can Each One Actually Recover?

## Status
validated

## Post Type
Technical guide and recovery-planning comparison

## Technologies Covered
- VMware ESXi and vSphere
- VMware virtual machine snapshots
- VMFS, vSAN, and Virtual Volumes (vVols)
- VMDK snapshot chains, delta disks, deletion, and consolidation
- VMware Tools guest quiescing and memory snapshots
- vSphere APIs for Data Protection (VADP) and Virtual Disk Development Kit (VDDK) backup workflows
- Raw Device Mapping (RDM), SCSI bus sharing, and HotAdd backup proxies
- Backup validation, disaster recovery, RPO, and RTO

## Sources Consulted
- Broadcom, Best practices for using VMware snapshots in the vSphere environment: https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html
- Broadcom, Guidance on using snapshots for database virtual machines: https://knowledge.broadcom.com/external/article/426571/guidance-on-using-snapshots-for-database.html
- Broadcom, Overview of virtual machine snapshots in vSphere: https://knowledge.broadcom.com/external/article/342618/understanding-virtual-machine-snapshots.html
- Broadcom, FAQ: Delete All Snapshots and Consolidate Snapshots Feature: https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html
- Broadcom, Understanding virtual machine snapshots within Virtual Volumes (vVols): https://knowledge.broadcom.com/external/article/341651
- Broadcom, Glossary of vSAN terms and acronyms: https://knowledge.broadcom.com/external/article/326549/glossary-of-vsan-terms-and-acronyms.html
- Broadcom, Snapshot and backup restrictions with SCSI bus sharing and physical-mode RDMs: https://knowledge.broadcom.com/external/article/311074/unable-to-use-snapshots-or-perform-a-bac.html
- Broadcom, Third-party backup troubleshooting responsibility: https://knowledge.broadcom.com/external/article/372500/unable-to-backup-a-virtual-machine-using.html
- Broadcom Virtual Disk API, Design and Implementation Overview for VADP backup and restore: https://developer.broadcom.com/xapis/virtual-disk-api/latest/vddkBkupVadp.9.2.html
- Broadcom Virtual Disk API, Low Level Backup Procedures: https://developer.broadcom.com/xapis/virtual-disk-api/latest/vddkBkupVadp.9.3.html
- Broadcom Virtual Disk API, Tips and Best Practices, including HotAdd cleanup: https://developer.broadcom.com/xapis/virtual-disk-api/latest/vddkBkupVadp.9.5.html
- Broadcom vSphere Web Services API, VirtualMachineSnapshot: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.Snapshot.html
- Broadcom, Reverting a virtual machine snapshot fails when the target snapshot disk is missing: https://knowledge.broadcom.com/external/article/424591/reverting-a-virtual-machine-snapshot-fai.html
- Broadcom, Stale VMDK locks left by third-party backup solutions: https://knowledge.broadcom.com/external/article/416996/stale-file-locks-on-vmdks-left-by-3rd-pa.html

## Issues Found
- The opening made a surviving catalog and a previously validated restore universal prerequisites for recovery. Some backup products can rebuild or import required metadata, and an intact but previously untested backup can still restore. The text now requires the backup data and whatever metadata, credentials, or encryption keys the product actually needs, and describes prior validation as evidence that the dependencies work.
- The dependency map said snapshot recovery always requires the VM's current active leaf. Reverting to a selected older snapshot depends on that snapshot's disk state and its required parent chain, not on later descendant deltas that represent the current state. The map now names the selected snapshot disk state and every required parent.

## Review Notes
All six links in the post's Official Documentation section returned HTTP 200 and led to the intended Broadcom articles. Article 342618 is now titled “Overview of virtual machine snapshots in vSphere,” but the existing older slug still resolves correctly. The post contains no executable commands or API examples; the review therefore focused on snapshot-chain semantics, backup workflows, storage and device restrictions, recovery claims, operational limits, and link validity. Backup restore granularity remains product- and configuration-dependent, which the post correctly states.
