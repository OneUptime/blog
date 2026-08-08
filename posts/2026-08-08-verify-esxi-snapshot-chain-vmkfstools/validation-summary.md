# Validation Summary: Verify a Broken ESXi Snapshot Chain with vmkfstools

## Status

validated

## Post Type

Troubleshooting and data-recovery guide

## Technologies Covered

- VMware vSphere and ESXi
- VMFS virtual disks and snapshot chains
- `vmkfstools` query, consistency-check, clone, and chain-repair modes
- VMDK descriptors, extents, `CID`, `parentCID`, and `parentFileNameHint`
- Snapshot inventory (`.vmsd`) and virtual machine configuration (`.vmx`)
- VMFS and vSAN file-lock investigation with `vmfsfilelockinfo`
- vSAN and Virtual Volumes (vVols) storage distinctions
- Changed Block Tracking (CBT)

## Sources Consulted

- Broadcom KB 309366, Verifying a snapshot chain and cloning a Virtual Disk from snapshots: https://knowledge.broadcom.com/external/article/309366/verifying-a-snapshot-chain-and-cloning-a.html
- Broadcom KB 343140, Cloning and converting virtual machine disks with vmkfstools: https://knowledge.broadcom.com/external/article/343140
- Broadcom KB 342618, Overview of virtual machine snapshots in VMware ESXi: https://knowledge.broadcom.com/external/article/342618
- Broadcom KB 345254, The parent virtual disk has been modified since the child was created: https://knowledge.broadcom.com/external/article/345254
- Broadcom KB 368913, Locate and remediate CID/parentCID mismatches using a scripted method: https://knowledge.broadcom.com/external/article/368913/locate-and-remediate-cidparentcid-mismat.html
- Broadcom KB 404894, Repairing broken disk chains when CID mismatch errors are reported: https://knowledge.broadcom.com/external/article/404894/repairing-broken-disk-chains-of-a-virtua.html
- Broadcom vSphere Web Services API, `RepairVmDiskChains_Task`: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.VirtualMachine.html
- Broadcom KB 341646, Troubleshooting virtual machine snapshot descriptor problems: https://knowledge.broadcom.com/external/article/341646/troubleshooting-virtual-machine-snapshot.html
- Broadcom KB 316575, Consolidating/Committing snapshots in VMware ESXi: https://knowledge.broadcom.com/external/article/316575/consolidatingcommitting-snapshots-in-vmw.html
- Broadcom KB 314365, Investigating virtual machine file locks on ESXi hosts: https://knowledge.broadcom.com/external/article/314365
- Broadcom KB 341651, Understanding virtual machine snapshots within Virtual Volumes: https://knowledge.broadcom.com/external/article/341651
- Broadcom KB 327862, Recreating a missing virtual disk descriptor file: https://knowledge.broadcom.com/external/article/327862

## Issues Found

- Scoped the parent-path and CID explanations to conventional VMFS snapshot descriptors. Native vVol snapshots use object-specific fields and semantics, so the previous generic wording was too broad.
- Distinguished an unresolvable parent path caused by a rename or deletion from an incoherent data history caused by replacing or writing to a parent. A rename alone does not alter disk contents.
- Escaped the literal dot in the VMX `grep` pattern (`\.vmdk`) so it does not act as a regular-expression wildcard.
- Reframed the two CID-mismatch categories as recovery states rather than exhaustive initiating causes. Broadcom also lists corruption, incomplete snapshot operations, power loss, interrupted migration, and manual manipulation as causes.
- Removed the implication that Broadcom permits general automatic CID repair. Its current repair guidance restricts repair to controlled, proven metadata-only cases.
- Scoped the shown `vmkfstools -i ... -d thin` example to a powered-off VMFS chain. Broadcom requires storage-specific handling for vSAN, including `-W vsan` in its cloning guidance.
- Clarified that a vSphere UI clone is a whole-VM clone, whereas the shown `vmkfstools -i` command clones one virtual disk.
- Added controller type to the information collected from the source VM and required the receiving test/recovery VM to be powered off. Broadcom warns that a CLI-cloned boot disk may need the source controller type, particularly when the source used PVSCSI.
- Corrected the scope of `vmkfstools -x repairChain`: Broadcom KB 404894 currently documents it for VCF 9.1, not as a generic ESXi 7.x/8.x repair command. The post now requires a powered-off VM, consistent with the vSphere 9.1 repair API.
- Distinguished the VCF 9.1 `repairChain` command from Broadcom KB 368913's separate ESXi 7.x/8.x `snapshot_chain_script.sh` workflow. The documented dry run belongs to that script, not to `vmkfstools -x repairChain` itself.
- Added Broadcom's required post-repair CBT reset when Changed Block Tracking was enabled.

## Review Notes

- The `vmkfstools -qv10`, `vmkfstools -e`, `vmkfstools -i ... -d thin`, and VCF 9.1 `vmkfstools -x repairChain` command forms match Broadcom documentation within their stated scopes.
- Broadcom KB 309366 presents `vmkfstools -e` as an ESXi 5.x option and requires the VM to be powered off. Other current Broadcom articles use `-e` on later ESXi versions; the post's version-qualified wording is therefore appropriate.
- `vmkfstools -qv10` checks whether DiskLib can open and traverse the chain. The post correctly avoids claiming that this establishes guest filesystem, database, or application consistency.
- Snapshot filenames are not reliable chain-order indicators. The post correctly uses the active descriptor shown in Edit Settings and follows `parentFileNameHint` links.
- All five links in the post's Official Documentation section returned HTTP 200 during review.
- The commands could not be executed locally because they require an ESXi host and an affected VMDK chain; syntax and behavior were validated against current official Broadcom documentation instead.
