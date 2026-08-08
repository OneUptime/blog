# Validation Summary: How to Build an ESXi VM and Datastore Inventory Report with PowerCLI

## Status
validated

## Post Type
Technical tutorial and operations guide

## Technologies Covered

- VMware Cloud Foundation (VCF) PowerCLI and VMware PowerCLI
- PowerShell
- VMware vCenter Server and standalone ESXi
- vSphere virtual machines, virtual disks, snapshots, and templates
- vSphere datastores, capacity reporting, and managed-object views
- CSV inventory reporting and spreadsheet formula-injection mitigation

## Sources Consulted

- [VCF PowerCLI home and current product naming](https://developer.broadcom.com/powercli)
- [PowerCLI installation and migration guide](https://developer.broadcom.com/powercli/installation-guide)
- [Connect-VIServer command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/connect-viserver)
- [Get-VM command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-vm)
- [PowerCLI VirtualMachine structure](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/structures/vmware.vimautomation.vicore.types.v1.inventory.virtualmachine)
- [Get-Datastore command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-datastore)
- [PowerCLI Datastore structure](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/structures/vmware.vimautomation.vicore.types.v1.datastoremanagement.datastore)
- [vSphere API DatastoreSummary data object](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.Datastore.Summary.html)
- [Get-HardDisk command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-harddisk)
- [PowerCLI HardDisk structure](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/structures/vmware.vimautomation.vicore.types.v1.virtualdevice.harddisk)
- [PowerShell Gallery VMware.VimAutomation.Core 13.5.0 package](https://www.powershellgallery.com/packages/VMware.VimAutomation.Core/13.5.0.25380678)
- [vSphere API VirtualDiskFlatVer2BackingInfo data object](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.device.VirtualDisk.FlatVer2BackingInfo.html)
- [Get-Snapshot command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-snapshot)
- [PowerCLI Snapshot structure](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/structures/vmware.vimautomation.vicore.types.v1.vm.snapshot)
- [Get-View command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-view)
- [Disconnect-VIServer command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/disconnect-viserver)
- [Official VMware PowerCLI storage-property walkthrough](https://blogs.vmware.com/cloud-foundation/2019/02/25/documentation-walkthrough/)
- [Broadcom guidance for checking VMDK references across VMs and templates](https://knowledge.broadcom.com/external/article/408915/to-verify-if-a-vmdk-in-a-datastore-is-at.html)
- [Broadcom guidance on snapshot files that are absent from Snapshot Manager](https://knowledge.broadcom.com/external/article/413101/snapshot-files-are-present-for-a-vm-thou.html)
- [Microsoft Export-Csv reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-csv?view=powershell-7.5)
- [Microsoft about_Try_Catch_Finally reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_try_catch_finally?view=powershell-7.5)

## Issues Found

- The snapshot-privilege paragraph said the script did not read snapshot size properties. `Get-Snapshot` itself attempts to populate snapshot disk size and can emit an insufficient-permissions message even when the report does not use those fields. Changed the statement to say that the report does not export the size properties.
- The module check was described as confirming the loaded module, but `Get-Module -ListAvailable` enumerates installed modules and the pipeline selects the newest available version. Corrected the wording accordingly.
- The statement that the script never substitutes missing values with zero was too absolute because PowerCLI supplies some non-nullable numeric properties. Narrowed the claim to the behavior the script controls: it does not deliberately replace caught missing values with zero.
- The orphan-disk wording treated a VMDK as “registered” and did not mention templates, which this report excludes. Changed it to describe VMDKs absent from the report and to require comparison against the complete VM-and-template inventory before treating a file as unreferenced or deletable.

## Review Notes

The embedded script parsed without syntax errors under PowerShell 7.5.2, and the documented parameter sets support all cmdlet combinations used. Current PowerCLI exposes `StorageFormat` on the concrete flat-disk type even though the published base `HardDisk` structure does not list it; the script's capability check correctly leaves the field blank for disk objects that do not expose that property. `Export-Csv` produces a zero-byte, headerless file for an empty collection, so downstream automation should tolerate that case or add explicit headers. Datastore capacity and free-space values are periodically refreshed management-plane summaries, not direct real-time measurements of back-end array allocation.
