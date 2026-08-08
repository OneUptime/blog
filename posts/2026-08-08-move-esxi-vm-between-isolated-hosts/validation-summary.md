# Validation Summary: How to Move an ESXi VM Between Isolated Hosts Without vMotion

## Status

validated

## Post Type

Technical migration guide and operational runbook

## Technologies Covered

- VMware ESXi and vSphere
- vCenter Server cold migration
- VMware Host Client and vSphere Client
- OVF and OVA export, transfer, and deployment
- VMware OVF Tool
- VMDK disks, snapshot chains, multi-writer/shared disks, and `vmkfstools`
- VMFS, NFS, and vSAN datastores
- vSphere Standard Switches and Distributed Switches
- VM encryption, vTPM, Secure Boot, UUIDs, and MAC addresses
- RDM, PCI passthrough, SR-IOV, and USB device dependencies

## Sources Consulted

- [Broadcom KB 320236: Moving a virtual machine between ESXi hosts with different processor types](https://knowledge.broadcom.com/external/article/320236)
- [Broadcom KB 317919: Moving or copying a virtual machine within a VMware environment](https://knowledge.broadcom.com/external/article/317919)
- [Broadcom KB 316536: Migration to a different processor](https://knowledge.broadcom.com/external/article/316536)
- [Broadcom KB 373304: Exporting a Virtual Machine as a Single OVA File in vSphere 6.5 and Later](https://knowledge.broadcom.com/external/article/373304)
- [Broadcom KB 431565: Unable to export an encrypted virtual machine to an OVF template](https://knowledge.broadcom.com/external/article/431565)
- [Broadcom KB 403026: vTPM-enabled virtual machines and OVF/OVA export limitations](https://knowledge.broadcom.com/external/article/403026)
- [Broadcom KB 325787: Direct OVF/OVA deployment restrictions on a vCenter-managed ESXi host](https://knowledge.broadcom.com/external/article/325787)
- [Broadcom KB 412923: VMDK file in OVF/OVA appears smaller than the original virtual disk](https://knowledge.broadcom.com/external/article/412923)
- [Broadcom KB 315281: Register a Virtual Machine to the vCenter Server Inventory](https://knowledge.broadcom.com/external/article/315281)
- [Broadcom KB 335224: Add or Register a Virtual Machine in vCenter Server](https://knowledge.broadcom.com/external/article/335224)
- [Broadcom KB 320246: Changing or keeping a UUID for a moved virtual machine](https://knowledge.broadcom.com/external/article/320246)
- [Broadcom KB 343140: Cloning and converting virtual machine disks with vmkfstools](https://knowledge.broadcom.com/external/article/343140)
- [Broadcom KB 337269: Understanding the relationship between Snapshot Manager and backing files](https://knowledge.broadcom.com/external/article/337269)
- [Broadcom KB 344559: Finding and listing virtual machine snapshots](https://knowledge.broadcom.com/external/article/344559)
- [Broadcom KB 318825: Best practices for using VMware snapshots in the vSphere environment](https://knowledge.broadcom.com/external/article/318825)
- [Broadcom KB 443404: Correct use of `-W vsan` with a vSAN destination](https://knowledge.broadcom.com/external/article/443404/vsan-vmfs-vmkfstools-cannot-retrieve.html)
- [Broadcom KB 319797: VMFS locking with multiple ESXi hosts](https://knowledge.broadcom.com/external/article/319797)
- [Broadcom KB 345232: Duplicate VMFS extents and signatures](https://knowledge.broadcom.com/external/article/345232)
- [Broadcom KB 313527: Simultaneous-write protection and multi-writer limitations](https://knowledge.broadcom.com/external/article/313527)
- [Broadcom OVF Tool documentation](https://developer.broadcom.com/tools/open-virtualization-format-ovf-tool/latest/)

## Issues Found

- The post did not explicitly state that the Client-based OVF workflow cannot export encrypted or directly vTPM-enabled VMs. Added the limitation and directed those VMs to a supported workflow that preserves keys and TPM state.
- The inventory and OVF guidance did not cover shared or multi-writer disks, for which OVF export is unsupported. Added the disk-sharing setting to the inventory and directed clustered workloads to their supported, coordinated cold-migration procedure.
- The distributed-switch warning was incorrectly attributed to Broadcom's disconnected/non-shared-storage workflow. Corrected the attribution to the shared-datastore unregister/register workflow and clarified that OVF deployment uses destination network mapping.
- OVF export was described as Broadcom's preferred independent-host workflow, although the cited article documents it as an alternative without declaring a preference. Removed the unsupported attribution while retaining the author's operational recommendation elsewhere.
- Direct Host Client deployment and registration were presented without distinguishing standalone from vCenter-managed hosts. Added instructions to use the managing vCenter because bypassing it can be restricted, cause a partial OVF deployment, or create an inventory mismatch.
- The OVF procedure could be read as preserving the source MAC address. Added a warning not to assume MAC preservation and to use the destination's supported manual-MAC policy when retaining the address is required.
- The checksum guidance could be read as requiring deployed datastore VMDKs to match exported VMDKs. Replaced it with checksum verification at byte-for-byte package-transfer stages and explained that exported stream-optimized disks are converted during deployment.
- The VMFS warning implied that simultaneous access by multiple ESXi hosts is inherently unsafe. Clarified that properly configured shared VMFS access is supported and identified the actual risks: inconsistent locking, cloned or snapshot LUN signatures, incorrect resignaturing, and duplicate VM power-on.
- An empty Snapshot Manager was treated as sufficient evidence of a consolidated disk. Added verification of each attached disk's backing descriptor because unmanaged delta disks can exist without appearing in Snapshot Manager.
- The moved-or-copied prompt was phrased as unconditional. Scoped it to transferred VMX files and made the instruction conditional on the prompt appearing.

## Review Notes

- The `vmkfstools -i` example, `-d thin` option, quoted datastore paths, powered-off requirement, destination-directory prerequisite, vSAN destination caveat, and PVSCSI-controller warning are correct.
- The `vim-cmd solo/registervm` command is valid for standalone-host registration. Registration through vCenter is required when vCenter manages the host.
- The statements about powered-off CPU migration, OVF versus OVA packaging, snapshot-chain behavior, temporary NFS staging, host-specific devices, isolated validation, and rollback retention are technically sound.
- All six links in the post's Official Documentation section resolve to the intended Broadcom articles.
