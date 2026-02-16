# How to Fix OperationNotAllowed Errors When Resizing Azure Virtual Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machines, Troubleshooting, OperationNotAllowed, VM Resize, Azure Compute, Cloud Infrastructure

Description: Step-by-step guide to diagnosing and fixing OperationNotAllowed errors when attempting to resize Azure Virtual Machines across different SKU families.

---

You need to resize a VM. Maybe traffic is growing and you need more CPU, or maybe you are downsizing to save costs. You head to the Azure portal, select a new size, click resize, and get hit with an "OperationNotAllowed" error. It is one of the more frustrating Azure experiences because the error message is often vague about why the operation was blocked.

I have dealt with this error more times than I can count, and the root cause falls into a handful of categories. Let me walk you through each one and how to fix it.

## Understanding the Error

The OperationNotAllowed error during VM resize typically looks something like this:

```
Operation 'resize' is not allowed on VM 'myVM' because the requested VM size
'Standard_D8s_v5' is not available in the current hardware cluster.
```

Or sometimes the more cryptic:

```
The requested VM size is not available in the current region/zone.
Please try a different size or deploy to a different region/zone.
```

The core issue is that Azure cannot fulfill your resize request given the current constraints of your VM's placement. There are several reasons this happens, and each one has a different fix.

## Cause 1: Hardware Cluster Limitations

When you create a VM, Azure places it on a physical hardware cluster. That cluster supports a specific set of VM sizes. When you try to resize to a size that the current cluster does not support, you get the OperationNotAllowed error.

This is the most common cause. For example, if your VM was created on a cluster that supports Dv3 and Dsv3 sizes, trying to resize to a Dv5 or Dsv5 might fail because the newer generation requires different hardware.

The fix is to deallocate the VM first. When you deallocate (not just stop), Azure releases the VM from its current hardware cluster. On the next start, Azure can place it on a cluster that supports the requested size.

```bash
# Deallocate the VM (releases it from the hardware cluster)
# Note: This is different from just stopping the VM
az vm deallocate --resource-group myResourceGroup --name myVM

# Now resize to the desired size
az vm resize --resource-group myResourceGroup --name myVM --size Standard_D8s_v5

# Start the VM on the new hardware
az vm start --resource-group myResourceGroup --name myVM
```

Be aware that deallocating changes the VM's public IP address unless you have a static IP allocated. It also resets the DHCP-assigned private IP, though the IP usually stays the same if it is still available in the subnet.

## Cause 2: Availability Set Constraints

If your VM is in an availability set, the resize options are limited to what the availability set's underlying hardware cluster supports. Availability sets pin VMs to a specific cluster of physical hosts, and all VMs in the set must be on hardware that supports their sizes.

To see what sizes are available for VMs in an availability set, run the following command.

```bash
# List available VM sizes for VMs in an availability set
# Only these sizes can be used without deallocating all VMs in the set
az vm list-sizes \
  --resource-group myResourceGroup \
  --availability-set myAvailabilitySet \
  -o table
```

If the size you need is not in the list, you have two options:

Option 1: Deallocate ALL VMs in the availability set. This forces Azure to re-evaluate hardware placement for the entire set and may make new sizes available.

```bash
# Deallocate all VMs in the availability set
# This is required because the cluster assignment is shared
az vm deallocate --ids $(az vm list \
  --resource-group myResourceGroup \
  --query "[?availabilitySet.id!=null].id" -o tsv)

# Resize the target VM
az vm resize --resource-group myResourceGroup --name myVM --size Standard_D8s_v5

# Start all VMs back up
az vm start --ids $(az vm list \
  --resource-group myResourceGroup \
  --query "[?powerState!='running'].id" -o tsv)
```

Option 2: Migrate to an availability zone or Virtual Machine Scale Set with Flexible orchestration, which offers more flexibility for VM sizing.

## Cause 3: Regional Capacity Constraints

Sometimes the VM size you want is simply not available in your Azure region, or the region has temporarily run out of capacity for that size. This has become more common with the surge in demand for GPU-enabled VMs.

Check what sizes are available in your region.

```bash
# List all available VM sizes in a specific region
az vm list-sizes --location eastus2 -o table

# Check if a specific size is available
az vm list-sizes --location eastus2 --query "[?name=='Standard_D8s_v5']" -o table
```

If the size is not available in your region, your options are:

- Choose a different VM size in the same family that is available
- Deploy in a different region where the size is available
- Open a support ticket to request capacity allocation (relevant for large deployments or specialized SKUs like GPU VMs)

## Cause 4: Subscription Quota Limits

Azure subscriptions have quota limits on the number of vCPUs you can use per VM family per region. If resizing your VM would push you over your quota, you get an OperationNotAllowed error.

Check your current quota usage.

```bash
# Check vCPU quota usage for a specific region
az vm list-usage --location eastus2 -o table

# Filter for a specific VM family
az vm list-usage --location eastus2 \
  --query "[?contains(name.value, 'standardDSv5Family')]" -o table
```

If you are at or near your quota, request an increase through the Azure portal under Subscriptions > Usage + quotas. Standard quota increases are usually approved within a few hours for reasonable amounts. Large increases or GPU quota requests may take longer and require justification.

## Cause 5: Azure Policy Restrictions

Your organization might have Azure Policies that restrict which VM sizes can be used. This is common in enterprise environments where governance teams limit options to approved SKUs.

Check if policies are blocking your resize.

```bash
# Check for policy assignments that might restrict VM sizes
az policy assignment list \
  --resource-group myResourceGroup \
  --query "[?contains(policyDefinitionId, 'virtualMachine')].{name:name, policy:policyDefinitionId}" \
  -o table

# Check compliance state for your VM
az policy state list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myVM" \
  --query "[?complianceState=='NonCompliant'].{policy:policyDefinitionName, state:complianceState}" \
  -o table
```

If a policy is blocking you, work with your governance team to either get an exemption or add your desired VM size to the allowed list.

## Cause 6: VM Is Using Specific Features

Certain VM features restrict which sizes you can resize to. For example:

- VMs with Ultra Disks can only resize to sizes that support Ultra Disks
- VMs with Trusted Launch can only resize to sizes that support Trusted Launch
- VMs using ephemeral OS disks can only resize to sizes that support ephemeral disks and have sufficient cache or temp disk space

If you are hitting these constraints, check the VM size capabilities documentation to find sizes that support your required features.

## Prevention Strategy

To avoid resize headaches in the future:

1. Use Availability Zones instead of Availability Sets when possible. Zones offer more resize flexibility.
2. Deploy VMs with static private and public IPs so deallocating does not cause address changes.
3. Monitor your quota usage and request increases proactively before you need them.
4. Test resize operations in non-production environments first to verify the target size is available on your current cluster.
5. Consider using Virtual Machine Scale Sets with Flexible orchestration mode, which handles placement and sizing more intelligently.

The OperationNotAllowed error is annoying but almost always solvable. Identify which constraint is blocking you, apply the appropriate fix, and document the workaround for your team so they do not have to debug the same issue from scratch.
