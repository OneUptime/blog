# Validation Summary: Find Which ESXi Host or Backup Proxy Owns a VMDK Lock

## Status

validated

## Post Type

Troubleshooting guide and operational runbook

## Technologies Covered

- VMware ESXi and vSphere
- VMFS file locking
- vSAN object locking
- VMDK snapshot chains, including flat, delta, and SEsparse extents
- `vmfsfilelockinfo`, `vmkfstools`, `vim-cmd`, `lsof`, and ESXi process inspection
- VDDK HotAdd and NBD backup transports
- Backup proxy disk cleanup
- `hostd`, `vpxa`, vSphere HA, and controlled host remediation

## Sources Consulted

- [Broadcom KB 314365: Investigating Virtual Machine file locks on ESXi Host(s)](https://knowledge.broadcom.com/external/article/314365/investigating-virtual-machine-file-locks.html)
- [Broadcom KB 326800: Investigating virtual disk file locks on vSAN](https://knowledge.broadcom.com/external/article/326800/investigating-virtual-disk-file-locks-on.html)
- [Broadcom KB 313833: VMware virtual machine file lock on VMFS datastore](https://knowledge.broadcom.com/external/article/313833/vmware-virtual-machine-file-lock-on-vmfs.html)
- [Broadcom KB 416996: Stale file locks on VMDKs left by third-party backup solutions](https://knowledge.broadcom.com/external/article/416996/stale-file-locks-on-vmdks-left-by-3rd-pa.html)
- [Broadcom KB 428126: Failed to detach disks during HotAdd Backup Operations](https://knowledge.broadcom.com/external/article/428126/failed-to-detach-disks-during-hotadd-bac.html)
- [Broadcom Virtual Disk API: VDDK tips and best practices](https://developer.broadcom.com/xapis/virtual-disk-api/latest/vddkBkupVadp.9.5.html)
- [Broadcom vSphere Web Services API: FileManager and QueryFileLockInfo](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.FileManager.html)
- [Broadcom KB 344559: Finding and listing virtual machine snapshots](https://knowledge.broadcom.com/external/article/344559/finding-and-listing-virtual-machine-snap.html)
- [Broadcom KB 320691: Recreating pass-through Raw Device Mapping files for a virtual machine](https://knowledge.broadcom.com/external/article/320691/recreating-passthrough-raw-device-mappin.html)
- [Broadcom KB 381876: Failed to lock the file during disk consolidation resulting in VM shutdown](https://knowledge.broadcom.com/external/article/381876/error-failed-to-lock-the-file-during-di.html)
- [Broadcom KB 375284: Invalid configuration error when removing a VMDK from a backup proxy](https://knowledge.broadcom.com/external/article/375284/error-removing-vmdk-from-a-vm-invalid-co.html)
- [Broadcom KB 418516: Failed to lock a vSAN VMDK opened by `cat` or `less`](https://knowledge.broadcom.com/external/article/418516/error-unable-to-enumerate-all-disks-fail.html)
- [Broadcom KB 423722: Unsupported direct inflation of a vSAN VMDK](https://knowledge.broadcom.com/external/article/423722/unable-to-poweron-vsan-vm-after-inflatin.html)
- [Broadcom KB 343140: Cloning and converting virtual disks with `vmkfstools`](https://knowledge.broadcom.com/external/article/343140)
- [Broadcom KB 402544: Version-specific vSAN descriptor repair](https://knowledge.broadcom.com/external/article/402544/error-a-specified-parameter-was-not-corr.html)
- [Broadcom KB 320280: Restarting Management Agents in ESXi](https://knowledge.broadcom.com/external/article/320280/restarting-management-agents-in-esxi.html)

## Issues Found

- The VMFS description treated flat and delta extents as exhaustive. It is now scoped to standard VMFS VMDKs because Raw Device Mappings use mapping files, and it includes SEsparse because VMFS-6 uses that format for snapshots. Broadcom's lock procedure explicitly directs administrators to flat, delta, or SEsparse extents.
- The `vmfsfilelockinfo` example supplied `-v` without its required vCenter host argument. It now uses the officially documented path-only form. Broadcom documents the vCenter-assisted form separately as `-v <vCenter> -u <user>`.
- The VMFS target-selection sentence could imply that the descriptor is always interchangeable with its data extent. It now directs readers to the exact locked object and explains that Broadcom's VMFS procedure normally targets the matching `-flat`, `-delta`, or `-sesparse` extent.
- The displayed vSAN loop used the shell glob `*`, which excludes hidden `.<uuid>.lck` object-lock files. The official hidden-lock loop using `.*lck` was added.
- The warning against copying or editing any vSAN VMDK was too broad. Broadcom supports those operations in specific procedures. The warning now prohibits unsupported direct inflation and flat-file manipulation while requiring a vSAN-specific procedure for copy, delete, or descriptor-edit operations.
- The management-agent restart sentence understated current Broadcom warnings. It now states that VM power state normally remains unchanged while current tasks, guest performance, and host stability can still be affected.

## Review Notes

- The ESXi 8.0 Update 2 lock-owner display claim remains current and matches Broadcom's documented vSphere Client path.
- The HotAdd and NBD explanations, proxy inspection steps, and warning never to delete the source VMDK from the datastore are correct.
- Lock modes, MAC-to-host resolution, `vmkfstools -D` corroboration, `lsof` process tracing, stale-process safeguards, fencing guidance, and controlled reboot guidance are consistent with the official procedures.
- vSAN object and descriptor handling is version- and condition-specific; the post correctly directs ambiguous or faulted-object cases to vSAN diagnostics and Broadcom Support.
