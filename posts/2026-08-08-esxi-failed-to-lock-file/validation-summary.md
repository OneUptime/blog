# Validation Summary: ESXi VM Won’t Power On: Troubleshoot Failed to Lock the File

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- VMware ESXi, vCenter Server, and vSphere Client
- VMFS file locking
- vSAN object locking
- VMDK base disks, snapshot descriptors, delta extents, and snapshot chains
- Changed Block Tracking (CBT)
- vSphere HA and vMotion
- Snapshot-based backup proxies and HotAdd transport
- ESXi Shell utilities: `vim-cmd`, `vmfsfilelockinfo`, `lsof`, `vmkfstools`, and `vm-support`

## Sources Consulted
- [Broadcom KB 314365: Investigating Virtual Machine file locks on ESXi Host(s)](https://knowledge.broadcom.com/external/article/314365/investigating-virtual-machine-file-locks.html)
- [Broadcom KB 313833: VMware virtual machine file lock on VMFS datastore](https://knowledge.broadcom.com/external/article/313833/vmware-virtual-machine-file-lock-on-vmfs.html)
- [Broadcom KB 381876: Error: Failed to lock the file during disk consolidation resulting in VM shutdown](https://knowledge.broadcom.com/external/article/381876/error-failed-to-lock-the-file-during-di.html)
- [Broadcom KB 374141: Snapshot consolidation failure: Failed to lock the file error](https://knowledge.broadcom.com/external/article/374141/snapshot-consolidation-failure-failed-to.html)
- [Broadcom KB 326800: Investigating virtual disk file locks on vSAN](https://knowledge.broadcom.com/external/article/326800/investigating-virtual-disk-file-locks-on.html)
- [Broadcom KB 418516: Error “Unable to enumerate all disks. Failed to lock the file” while powering on a VM on vSAN](https://knowledge.broadcom.com/external/article/418516/error-unable-to-enumerate-all-disks-fail.html)
- [Broadcom KB 318825: Best practices for using VMware snapshots in the vSphere environment](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html)
- [Broadcom KB 339335: “vSphere HA virtual machine failed to failover” error in vCenter Server](https://knowledge.broadcom.com/external/article/339335/vsphere-ha-virtual-machine-failed-to-fai.html)
- [Broadcom KB 309366: Verifying a snapshot chain and cloning a virtual disk from snapshots](https://knowledge.broadcom.com/external/article/309366)
- [Broadcom KB 321422: Recreating a missing VMware virtual machine disk descriptor file](https://knowledge.broadcom.com/external/article?articleNumber=321422)
- [Broadcom KB 313542: Collecting diagnostic information for VMware ESX/ESXi using `vm-support`](https://knowledge.broadcom.com/external/article/313542)
- [Broadcom KB 306962: Location and contents of ESXi log files](https://knowledge.broadcom.com/external/article/306962/location-and-contents-of-esxi-log-files.html)

## Issues Found
- **Incorrect `vmfsfilelockinfo -v` usage:** The post described `-v` as a standalone verbose flag. Broadcom documents `-v` as the vCenter endpoint argument and pairs it with `-u` for the vCenter/SSO user. Removed the bare `-v` from the basic query and documented the valid optional form, `-v <vCenter_IP_or_FQDN> -u <SSO_user>`.
- **Overly broad VMFS query target:** The post said to query the exact path in the high-level error even though that path may be a VMDK descriptor while the lock is on its backing extent. Changed the guidance to query the exact `-flat.vmdk`, `-delta.vmdk`, or `-sesparse.vmdk` backing file identified from the detailed error or logs.
- **Incorrect World ID attribution:** The normal `vmfsfilelockinfo` workflow reports the lock mode and owner MAC/host; the Cartel or World ID is identified separately on the owning host with `lsof` and process information. Removed the claim that the lock-query result itself normally includes a World ID.
- **Unsafe fencing wording:** Network isolation alone can leave an ESXi host's VMs running and retaining their storage locks. Replaced “fence that host from the storage or network” with the safe requirement to power off the host or fence it from shared storage before starting another copy.
- **Snapshot-chain command prerequisite omitted:** `vmkfstools -e` requires the VM to be powered off so it can open the chain without the running VM's locks. Added that prerequisite.
- **Imprecise `grep` expression:** The unescaped dot in `.vmdk` was a regular-expression wildcard, and the VMX path was not protected against spaces. Changed the command to use the literal pattern `\.vmdk` and quote the path.

## Review Notes
- All six URLs originally listed in the post resolved successfully and pointed to the intended Broadcom articles.
- The backup-proxy HotAdd behavior, read-only-lock explanation, safe disk-detachment warning, VMFS lock modes, ESXi log paths, and `vm-support -w` syntax are accurate.
- Broadcom KB 418516 covers a narrow vSAN failure involving an open VMDK or stale task. KB 326800 is the general vSAN object-lock procedure that directly supports the post's vSAN guidance.
- `vmkfstools -e` remains documented in current Broadcom material for supported ESXi releases, although some procedures use `vmkfstools -qv10`; administrators should follow the command named by the KB for their exact incident and version.
