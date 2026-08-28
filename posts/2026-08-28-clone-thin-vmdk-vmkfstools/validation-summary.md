# Validation Summary: How to Clone a Thin-Provisioned VMDK with `vmkfstools` Without Inflating It

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- VMware vSphere ESXi
- `vmkfstools`
- VMDK descriptors, extents, and snapshot chains
- Thin, zeroed-thick, and eager-zeroed-thick virtual disks
- VMFS, NFS, and vSAN datastores
- VMX virtual SCSI controller configuration

## Sources Consulted

- [Broadcom KB 343140: Cloning and converting virtual machine disks with vmkfstools](https://knowledge.broadcom.com/external/article/343140/cloning-and-converting-virtual-machine-d.html)
- [Broadcom KB 309366: Verifying a snapshot chain and cloning a Virtual Disk from snapshots](https://knowledge.broadcom.com/external/article/309366)
- [Broadcom KB 418614: Cloning a single dependent VMDK from a running, multi-disk ESXi VM](https://knowledge.broadcom.com/external/article/418614/cloning-a-single-dependent-vmdk-from-a-r.html)
- [Broadcom KB 308992: Types of supported Virtual Disks on ESXi hosts](https://knowledge.broadcom.com/external/article/308992/types-of-supported-virtual-disks-on-esxi.html)
- [Broadcom vSphere 8 documentation: Cloning a Virtual Disk or RDM](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-storage/using-vmkfstools-in-vsphere/virtual-disk-options-of-vsphere-vmkfstools-command/cloning-a-virtual-or-raw-disk.html)
- [Broadcom vSphere 8 documentation: Supported Disk Formats](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-storage/using-vmkfstools-in-vsphere/virtual-disk-options-of-vsphere-vmkfstools-command/supported-disk-formats.html)
- [Broadcom KB 443404: vSAN-to-VMFS clone failure when `-W vsan` is used](https://knowledge.broadcom.com/external/article/443404/vsan-vmfs-vmkfstools-cannot-retrieve.html)
- [Broadcom KB 326952: Unable to upload, copy, or create files in a VMware vSAN-backed datastore](https://knowledge.broadcom.com/external/article/326952/unable-to-upload-copy-or-create-files-in.html)
- [Broadcom KB 321422: Recreating a missing VMware virtual machine disk descriptor file](https://knowledge.broadcom.com/external/article/321422)
- [Broadcom KB 426723: Cloning or deploying a VM changes `adapterType` in the VMDK](https://knowledge.broadcom.com/external/article/426723/cloning-or-deploying-vm-from-template-is.html)
- [Broadcom KB 387210: Consolidating snapshots with `vmkfstools`](https://knowledge.broadcom.com/external/article/387210)
- [Broadcom KB 317919: Moving or copying a virtual machine within a VMware environment](https://knowledge.broadcom.com/external/article/317919/moving-or-copying-a-virtual-machine-with.html)
- [Broadcom KB 337348: Using thin provisioned disks with virtual machines](https://knowledge.broadcom.com/external/article/337348/using-thin-provisioned-disks-with-virtua.html)

## Issues Found

- The live-VM exception did not state its documented version scope or distinguish its source descriptor from the offline snapshot-chain procedure. It now identifies the Broadcom procedure as applying to ESXi and vCenter 8.x and explains that, when the disk is on its base before the temporary snapshot, the snapshot redirects writes so the frozen base descriptor, not the new active leaf, is cloned. The current-leaf guidance and command are now explicitly limited to an offline or powered-off VM.
- The destination-directory command was presented as datastore-neutral, but ordinary `mkdir` at a vSAN datastore root is unsupported. The command is now scoped to VMFS/NFS, with the documented vSAN namespace methods identified separately.
- The vSAN option guidance implied that `-W vsan` depended on the source VMDK. It now correctly depends on a vSAN destination and explicitly says to omit the option for VMFS/NFS destinations, including vSAN-to-VMFS/NFS clones.
- The descriptor check did not inspect the thin-provisioning marker, and `createType="vmfs"` alone cannot distinguish thin from thick. The `grep` command now includes `ddb.thinProvisioned`, and the explanation identifies the expected `ddb.thinProvisioned = "1"` value while retaining the UI allocation check. It also clarifies that a fully allocated source can yield a thin clone whose consumed and provisioned capacities are equal.
- The controller explanation treated cloned LSI descriptor metadata as though it selected the VM's actual controller. It now distinguishes deprecated `ddb.adapterType` metadata from the controller configured in **Edit Settings** or `scsi#.virtualDev` and requires a controller for which the guest has a boot driver.
- The statement about copying only a descriptor was too absolute because a copied descriptor can still reference the original extent. It now states the relevant failure precisely: no disk data is copied and no independent clone is created.
- The label for KB 309366 did not use the article's actual title. It was updated to identify the snapshot-chain verification and cloning article accurately.

## Review Notes

The core `vmkfstools -i <source-descriptor> <destination-descriptor> -d thin` syntax is current and correct. The guidance to power off the VM for the general procedure, select the active snapshot leaf for an offline snapshot-state clone, avoid passing data extents directly, preserve datastore headroom, isolate a cloned boot disk, and retain the source until validation is supported by the cited Broadcom documentation. Broadcom's live single-dependent-disk procedure is currently scoped to ESXi and vCenter 8.x; confirm release-specific guidance before applying it elsewhere.
