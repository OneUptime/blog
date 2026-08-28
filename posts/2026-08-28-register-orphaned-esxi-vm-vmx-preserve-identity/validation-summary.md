# Validation Summary: How to Register an Orphaned ESXi VM from Its `.vmx` File Without Changing Its Identity

## Status

validated

## Post Type

Technical recovery guide

## Technologies Covered

- VMware vSphere ESXi
- VMware vCenter Server and vSphere Client
- VMware Host Client
- VMX virtual machine configuration files
- VMDK virtual disks and snapshot chains
- vSphere inventory identity, BIOS UUIDs, instance UUIDs, MoRefs, and virtual NIC MAC addresses
- vSphere distributed networking, encryption, and virtual TPM dependencies

## Sources Consulted

- [Broadcom KB 315281: Register a Virtual Machine to the vCenter Server Inventory](https://knowledge.broadcom.com/external/article/315281/register-a-virtual-machine-to-the-vcente.html)
- [Broadcom KB 335224: Add or Register a Virtual Machine in vCenter Server](https://knowledge.broadcom.com/external/article/335224/add-or-register-a-virtual-machine-vm-in.html)
- [Broadcom KB 422311: Register a Virtual Machine on Another ESXi Host Without Changing the MoRef ID](https://knowledge.broadcom.com/external/article/422311/register-a-virtual-machine-on-another-es.html)
- [Broadcom KB 391738: Refreshing vSAN After a Node Loss and Recovering Inaccessible/Orphaned VMs](https://knowledge.broadcom.com/external/article/391738/refreshing-vsan-after-a-node-loss-and-re.html)
- [Broadcom KB 391782: Unable to Register Virtual Machine](https://knowledge.broadcom.com/external/article/391782/unable-to-register-virtual-machine.html)
- [Broadcom KB 344709: Virtual Machine Options Are Grayed Out in vSphere Client](https://knowledge.broadcom.com/external/article/344709/virtual-machine-options-are-grayed-out-i.html)
- [Broadcom KB 312831: Virtual Machines Appear as Invalid, Orphaned, or Inaccessible](https://knowledge.broadcom.com/external/article/312831/virtual-machines-appear-as-invalid-or-or.html)
- [Broadcom KB 308457: Powering Off an Unresponsive Virtual Machine on an ESXi Host](https://knowledge.broadcom.com/external/article/308457/powering-off-an-unresponsive-virtual-mac.html)
- [Broadcom KB 308360: Performing Common Virtual Machine Tasks via Command-Line Utilities](https://knowledge.broadcom.com/external/article/308360/performing-common-virtual-machine-relate.html)
- [Broadcom KB 314365: Investigating Virtual Machine File Locks on ESXi Hosts](https://knowledge.broadcom.com/external/article/314365/investigating-virtual-machine-file-locks.html)
- [Broadcom KB 320246: Changing or Keeping a UUID for a Moved Virtual Machine](https://knowledge.broadcom.com/external/article/320246/changing-or-keeping-a-uuid-for-a-moved-v.html)
- [Broadcom KB 323108: `uuid.location` Behavior After Answering "I Moved It"](https://knowledge.broadcom.com/external/article?legacyId=85174)
- [Broadcom KB 342208: Renaming a Virtual Machine and Its Files](https://knowledge.broadcom.com/external/article/342208/renaming-a-virtual-machine-and-its-files.html)
- [Broadcom KB 423046: Manually Assigned MAC Address VMX Entries](https://knowledge.broadcom.com/external/article/423046/manually-set-static-mac-address-of-000c2.html)
- [Broadcom KB 433111: Automatically Assigned MAC Address VMX Entries](https://knowledge.broadcom.com/external/article/433111/linux-guest-os-shows-network-interfaces.html)
- [Broadcom KB 445983: `vc.uuid` and the VM Instance UUID](https://knowledge.broadcom.com/external/article/445983/)
- [Broadcom KB 384862: Delete from Disk and Remove from Inventory](https://knowledge.broadcom.com/external/article/384862/delete-from-disk-and-remove-from-invento.html)
- [Broadcom KB 430686: Validate Whether a VM Uses a VMDK by Inspecting the VMX](https://knowledge.broadcom.com/external/article/430686/how-to-validate-if-a-vm-is-using-a-vmdk.html)
- [Broadcom KB 438889: vDS Port Groups in the ESXi Host Client](https://knowledge.broadcom.com/external/article/438889/vds-port-groups-missing-in-esxi-host-cli.html)
- [Broadcom vSphere Web Services API: VirtualMachineConfigInfo](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.ConfigInfo.html)
- [Broadcom vSphere Web Services API: VirtualMachine and UnregisterVM](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.VirtualMachine.html)

## Issues Found

- The original preflight used only `vim-cmd vmsvc/getallvms`, which lists registered VMs but is not sufficient to prove that no VMX process is still running. Added `esxcli vm process list` and required checking both outputs for the VM name and VMX path.
- The VMX inspection command matched only SCSI disk `fileName` entries, so it could miss IDE-, SATA-, or NVMe-backed VMDKs. Replaced that part with a controller-neutral `.vmdk` search, which also follows Broadcom's documented inspection method.
- The identity inspection omitted `vc.uuid`, which is the vCenter instance UUID, and omitted manual MAC-address entries stored as `ethernetN.address`. Expanded the identity grep to include `vc.uuid`, `address`, `addressType`, and `generatedAddress`.
- The post displayed `uuid.location` alongside identity values without explaining that it is location-derived. Added a clarification that it can legitimately change when the host or VMX path changes and is not the guest-visible BIOS UUID.
- The direct Host Client and CLI paths did not state Broadcom's warning for vCenter-managed hosts. Added guidance to register through vCenter normally and to use host-side registration only for a scoped recovery workflow, followed by inventory reconciliation.
- The description of KB 422311 called it a vCenter workflow even though its documented procedure uses the target ESXi host's Host Client. Corrected the wording while retaining its explicit vCenter 7.x/8.x scope.
- The KB 391738 link label was broader than the article's vSAN node-loss scenario. Updated the label to state that scope.
- Clarified the UI terminology: **Remove from Inventory** is the vCenter action, while **Unregister** is the corresponding Host Client action. Both retain datastore files; **Delete from Disk** does not.

## Review Notes

All original documentation URLs resolved during validation. The `vim-cmd vmsvc/getallvms`, `esxcli vm process list`, `vim-cmd solo/registervm`, and `vim-cmd vmsvc/power.getstate` forms match current Broadcom procedures. The post correctly distinguishes the guest-visible BIOS UUID, vCenter instance UUID, host-local VM ID, and MoRef; correctly selects **I moved it** only for the one original VM; and correctly treats KB 422311's MoRef-preserving result as a version- and workflow-specific exception rather than a universal guarantee.
