# Validation Summary: How to Fix OperationNotAllowed Errors When Resizing Azure Virtual Machines

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure CLI
- Azure availability sets
- Azure VM SKUs and resize operations
- Azure public and private IP allocation
- Azure subscription vCPU quotas
- Azure Policy
- Azure VM features such as Ultra Disks, Trusted Launch, and ephemeral OS disks

## Sources Consulted
- Microsoft Learn: Change the size of a virtual machine - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm
- Microsoft Learn: Azure CLI `az vm` command reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm availability-set` command reference - https://learn.microsoft.com/en-us/cli/azure/vm/availability-set?view=azure-cli-latest
- Microsoft Learn: Private IP addresses in Azure - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/private-ip-addresses
- Microsoft Learn: Public IP addresses in Azure - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Microsoft Learn: Check vCPU quotas - https://learn.microsoft.com/en-us/azure/virtual-machines/quotas
- Microsoft Learn: Azure CLI `az policy state` command reference - https://learn.microsoft.com/en-us/cli/azure/policy/state?view=azure-cli-latest
- Microsoft Learn: Ephemeral OS disks for Azure VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks

## Issues Found
- The availability set size-check command used `az vm list-sizes` with `--resource-group` and `--availability-set`, which is not the current Azure CLI command shape. I changed it to `az vm availability-set list-sizes --resource-group ... --name ...`, matching the official Azure CLI command reference.
- The availability set deallocation snippet selected every VM in the resource group that belonged to any availability set. I changed it to read VM IDs from the named availability set with `az vm availability-set show`, then reuse those IDs for deallocate and start operations.
- The restart command queried `powerState` from `az vm list` without requesting instance view details and could start unrelated VMs. I changed it to start the same availability-set VM IDs that were deallocated.
- The regional size checks used `az vm list-sizes`, which the current Azure CLI reference marks as deprecated. I changed those commands to use `az vm list-skus --location ... --resource-type virtualMachines`.
- The deallocation warning said DHCP-assigned private IPs are reset. Microsoft documentation states Azure Resource Manager VM private IPs do not change due to stop/deallocate alone; they are released when the NIC is deleted, reassigned to another subnet, or its IP configuration changes. I corrected the warning while keeping the dynamic public IP caveat.

## Review Notes
The core troubleshooting flow is technically accurate: VM resize can require deallocation when the target size is not available on the current hardware cluster, availability sets can require all VMs in the set to be deallocated, vCPU quota is enforced per region and family, and VM features such as Ultra Disk, Trusted Launch, and ephemeral OS disks constrain size choices. Azure CLI was not installed in the local environment, so command validation was performed against the current Microsoft Learn Azure CLI reference instead of local `az --help` output.
