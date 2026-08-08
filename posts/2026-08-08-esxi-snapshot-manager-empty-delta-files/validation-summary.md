# Validation Summary: ESXi Snapshot Manager Is Empty but Delta Files Remain: What Happened?

## Status
validated

## Post Type
Troubleshooting and Recovery Guide

## Technologies Covered
- VMware vSphere and vSphere Client
- VMware ESXi and vCenter Server
- Snapshot Manager and snapshot consolidation
- VMFS, vSAN, and vVol datastores
- VMDK descriptors, delta disks, and SEsparse extents
- Backup and replication snapshot workflows
- `vmkfstools` and `vmfsfilelockinfo`

## Sources Consulted
- Broadcom KB 316545 — Undetected Snapshots in Snapshot Manager and Snapshot Chain: https://knowledge.broadcom.com/external/article/316545/undetected-snapshots-in-snapshot-manager.html
- Broadcom KB 341646 — Troubleshooting virtual machine snapshot descriptor problems: https://knowledge.broadcom.com/external/article/341646/troubleshooting-virtual-machine-snapshot.html
- Broadcom KB 316575 — Consolidating/Committing snapshots in VMware ESXi: https://knowledge.broadcom.com/external/article/316575/consolidatingcommitting-snapshots-in-vmw.html
- Broadcom KB 309366 — Verifying a snapshot chain and cloning a Virtual Disk from snapshots: https://knowledge.broadcom.com/external/article/309366/verifying-a-snapshot-chain-and-cloning-a.html
- Broadcom KB 434690 — Disk consolidation needed warnings appear on multiple VMs following storage array capacity saturation: https://knowledge.broadcom.com/external/article/434690/disk-consolidation-needed-warnings-appea.html
- Broadcom KB 318825 — Best practices for using VMware snapshots in the vSphere environment: https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html
- Broadcom KB 342618 — Overview of virtual machine snapshots in vSphere: https://knowledge.broadcom.com/external/article/342618/overview-of-virtual-machine-snapshots-in.html
- Broadcom KB 345254 — "The parent virtual disk has been modified since the child was created" error: https://knowledge.broadcom.com/external/article/345254/the-parent-virtual-disk-has-been-modifie.html
- Broadcom KB 432870 — VMs show only snapshot files and no base disk in the VM directory: https://knowledge.broadcom.com/external/article/432870/vms-show-only-snapshot-files-and-no-base.html
- Broadcom KB 371714 — FAQ: Delete all Snapshots and Consolidate Snapshots Feature: https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html
- Broadcom KB 343140 — Cloning and converting virtual machine disks with vmkfstools: https://knowledge.broadcom.com/external/article/343140/cloning-and-converting-virtual-machine-d.html
- Broadcom KB 314365 — Investigating Virtual Machine file locks on ESXi Host(s): https://knowledge.broadcom.com/external/article/314365/investigating-virtual-machine-file-locks.html
- Broadcom KB 326800 — Investigating virtual disk file locks on vSAN: https://knowledge.broadcom.com/external/article/326800
- Broadcom KB 408915 — To verify if a VMDK in a datastore is attached to any virtual machine or template: https://knowledge.broadcom.com/external/article/408915/to-verify-if-a-vmdk-in-a-datastore-is-at.html
- Broadcom KB 425198 — Delete Orphaned Virtual Disks for a VM: https://knowledge.broadcom.com/external/article/425198/delete-orphaned-virtual-disks-for-a-vm.html
- Broadcom KB 419838 — Removing a disk from a virtual machine using the vSphere Client: https://knowledge.broadcom.com/external/article/419838
- Broadcom KB 309951 — Migrating virtual machines with snapshots: https://knowledge.broadcom.com/external/article/309951/migrating-virtual-machines-with-snapshot.html
- Broadcom KB 315391 — VM fails to power on with a missing-file or cannot-open-disk error: https://knowledge.broadcom.com/external/article/315391

## Issues Found
- A numbered `-00000X.vmdk` backing was described as conclusive proof that the VM was using a snapshot descriptor. Broadcom documents cases where a numbered descriptor has `parentCID=ffffffff` and functions as a base disk after incomplete cleanup. The post now says to verify the descriptor's parent relationship instead of classifying it by filename alone.
- The chain-verification section implied that `vmkfstools -qv10` required the VM to be powered off. Broadcom's current procedure runs that query on the ESXi host owning the VM and does not require shutdown; the power-off restriction applies to the older ESXi 5.x `vmkfstools -e` check. The prerequisite and lock explanation were corrected.
- The VMX inspection command did not state that a powered-on VM's configuration should be read from its registered host. The post now identifies the correct host because other hosts may be unable to read the locked `.vmx` file.
- The CLI cloning example was not explicitly scoped to VMFS and omitted Broadcom's controller compatibility warning. It is now scoped to VMFS and tells readers to match the source virtual SCSI controller type, preventing a PVSCSI source from failing to boot with an LSI-tagged clone.
- The orphan check mentioned template inventory but named only `.vmx` configuration files. It now also checks template `.vmtx` files.
- The SEsparse extent example abbreviated the filename to `-sesparse.vmdk`. It now shows the complete `AppVM-000007-sesparse.vmdk` naming pattern.
- The storage-only migration explanation broadly referred to all configured files. It now describes moving the VM's configured storage without implying that shared or external dependencies move with it.

## Review Notes
- All six links in the post's Official Documentation section were reachable and matched their labels at review time.
- The `grep`, `ls`, `vmkfstools -qv10`, and `vmkfstools -i ... -d thin` command forms are valid for their stated scope.
- The consolidation, create-snapshot/Delete All, clone, storage-migration, orphan-deletion, and 72-hour snapshot guidance agrees with the cited Broadcom procedures.
- The post correctly separates VMFS file inspection from vSAN object-lock handling and directs complex vSAN, vVol, encrypted, shared-disk, and damaged-chain cases to their platform-specific workflow or Broadcom Support.
