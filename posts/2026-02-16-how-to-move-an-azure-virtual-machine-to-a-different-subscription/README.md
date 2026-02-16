# How to Move an Azure Virtual Machine to a Different Subscription

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machines, Subscription, Resource Management, Cloud Migration, Azure CLI

Description: Step-by-step guide to moving Azure virtual machines between subscriptions including prerequisites, dependent resources, and common pitfalls.

---

Moving an Azure VM from one subscription to another sounds like it should be simple. It is a move operation, not a migration - the VM stays in the same Azure region, on the same underlying infrastructure, and nothing gets recreated. But in practice, there are enough gotchas and dependent resources to trip you up if you do not plan carefully.

I have moved VMs between subscriptions several times for various reasons: reorganizing billing, splitting a monolithic subscription into per-team subscriptions, transferring resources after an acquisition, and consolidating dev/test resources. Each time, the process itself was smooth once I got the prerequisites sorted out. The prerequisites are where people usually stumble.

## Understanding the Move Operation

When you move a VM between subscriptions, Azure performs a control plane operation. The VM's resource ID changes (because the subscription ID is part of the resource ID), but the underlying compute, storage, and networking stay in place. There is no data copy, no redeployment, and typically no downtime if the VM is already stopped.

That said, Microsoft recommends stopping (deallocating) the VM before moving it. While some moves work with running VMs, stopping the VM avoids edge cases and makes the process more predictable.

## Prerequisites

Before you start, work through this checklist:

1. The source and destination subscriptions must exist within the same Azure Active Directory tenant.
2. The destination subscription must be registered for the resource providers used by the VM (Microsoft.Compute, Microsoft.Network, Microsoft.Storage at minimum).
3. Your account needs at least Contributor access on both the source and destination resource groups.
4. The destination subscription must have sufficient quota for the VM size you are moving.
5. Any Azure policies on the destination subscription should not block the incoming resources.

Let me show you how to verify these.

### Check Azure AD Tenant

Both subscriptions need to be in the same Azure AD tenant. You can verify this with the CLI:

```bash
# List subscriptions and their tenant IDs
az account list --query "[].{Name:name, SubscriptionId:id, TenantId:tenantId}" -o table
```

If the subscriptions are in different tenants, you cannot use the move operation. You would need to export and recreate the VM instead.

### Register Resource Providers

The destination subscription needs the same resource providers registered. Check and register them:

```bash
# Check resource provider registration in the destination subscription
az provider list --subscription "dest-subscription-id" \
  --query "[?registrationState=='Registered'].namespace" -o table

# Register required providers if missing
az provider register --namespace Microsoft.Compute --subscription "dest-subscription-id"
az provider register --namespace Microsoft.Network --subscription "dest-subscription-id"
az provider register --namespace Microsoft.Storage --subscription "dest-subscription-id"
```

### Check Quotas

Make sure the destination subscription has enough vCPU quota for your VM size:

```bash
# Check vCPU quota in the destination subscription for a specific region
az vm list-usage --location eastus --subscription "dest-subscription-id" -o table
```

## Identifying Dependent Resources

Here is the part that catches people off guard. A VM is not a single resource - it is a collection of resources that depend on each other. When you move the VM, you need to move all of its dependent resources together in the same move operation.

These typically include:

- The VM itself (Microsoft.Compute/virtualMachines)
- OS disk and data disks (Microsoft.Compute/disks)
- Network interface(s) (Microsoft.Network/networkInterfaces)
- Public IP address(es) (Microsoft.Network/publicIPAddresses)
- Network Security Group(s) (Microsoft.Network/networkSecurityGroups)
- Virtual Network (Microsoft.Network/virtualNetworks) - if not shared with other resources

You can get the list of resources associated with your VM:

```bash
# Get the VM's resource details including disk and NIC IDs
az vm show --resource-group myResourceGroup --name myVM \
  --query "{VM:id, OSDisk:storageProfile.osDisk.managedDisk.id, DataDisks:storageProfile.dataDisks[].managedDisk.id, NICs:networkProfile.networkInterfaces[].id}" \
  -o json
```

The tricky part is virtual networks. If your VM is the only resource using a VNet, you can move the VNet along with it. But if other VMs share that VNet, you cannot move it. In that case, you will need to create a new VNet in the destination and reconfigure the NIC after the move, or use VNet peering.

## Validating the Move

Before actually performing the move, Azure lets you validate whether it will succeed. This is a dry run that checks all the constraints without actually moving anything.

```bash
# Validate the move operation
az resource invoke-action \
  --action validateMoveResources \
  --ids "/subscriptions/source-sub-id/resourceGroups/myResourceGroup" \
  --request-body "{
    \"resources\": [
      \"/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myVM\",
      \"/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Compute/disks/myVM_OsDisk\",
      \"/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Network/networkInterfaces/myVM-nic\"
    ],
    \"targetResourceGroup\": \"/subscriptions/dest-sub-id/resourceGroups/destResourceGroup\"
  }"
```

If the validation returns errors, fix them before attempting the real move. Common validation failures include missing resource provider registrations, quota limits, and policy violations.

## Performing the Move

Once validation passes, deallocate the VM and execute the move.

```bash
# Deallocate the VM first
az vm deallocate --resource-group myResourceGroup --name myVM

# Move all related resources to the destination subscription
az resource move \
  --destination-group destResourceGroup \
  --destination-subscription-id "dest-subscription-id" \
  --ids \
    "/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myVM" \
    "/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Compute/disks/myVM_OsDisk" \
    "/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Compute/disks/myVM_DataDisk1" \
    "/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Network/networkInterfaces/myVM-nic" \
    "/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myVM-ip" \
    "/subscriptions/source-sub-id/resourceGroups/myResourceGroup/providers/Microsoft.Network/networkSecurityGroups/myVM-nsg"
```

The move operation can take several minutes. The resources will be locked during the move, meaning no modifications can be made to them until the operation completes.

## After the Move

Once the move completes, there are several things to verify and update:

### Start the VM

```bash
# Start the VM in the new subscription context
az vm start --resource-group destResourceGroup --name myVM --subscription "dest-subscription-id"
```

### Update Monitoring and Alerts

If you had Azure Monitor alerts, diagnostic settings, or log analytics configurations pointing to the VM, those references used the old resource ID. You will need to update or recreate them in the new subscription context.

### Update Automation Scripts

Any scripts, runbooks, or CI/CD pipelines that reference the VM by its resource ID will need updating. The subscription ID portion of every resource ID has changed.

### Check RBAC Assignments

Role-based access control assignments at the resource level do not move with the resource. If you had specific RBAC assignments on the VM or its resources, you will need to recreate them in the new subscription.

### Review Locks

Resource locks (CanNotDelete, ReadOnly) need to be removed before the move and reapplied afterward. If you forgot to remove them, the move would have failed during validation anyway.

## Moving VMs with Special Configurations

Some VM configurations add complexity to the move:

**VMs with Azure Backup**: You need to stop the backup, delete the recovery points (or keep them in the source vault), and then reconfigure backup in the destination subscription after the move.

**VMs with Managed Identity**: System-assigned managed identities are tied to the resource and will be re-created, but any role assignments for that identity need to be reconfigured. User-assigned managed identities can be moved along with the VM if they are in the same resource group.

**VMs in Availability Sets**: You must move the entire availability set along with all VMs in it. You cannot move a single VM out of an availability set to a different subscription.

**VMs with Azure Disk Encryption**: Encrypted VMs can be moved, but you need to ensure the Key Vault and its keys are accessible from the destination subscription. This often means the Key Vault needs to be in the same tenant.

## Monitoring the Move

For production moves, you want visibility into whether the operation succeeded or failed. You can check the activity log for the move operation status:

```bash
# Check the activity log for move operations
az monitor activity-log list \
  --resource-group myResourceGroup \
  --offset 1h \
  --query "[?operationName.value=='Microsoft.Resources/moveResources/action'].{Status:status.value, Time:eventTimestamp}" \
  -o table
```

Setting up alerts with OneUptime before the move means you will get notified about any access issues or performance changes immediately after the VM starts in its new subscription context.

## Wrapping Up

Moving an Azure VM between subscriptions is a control plane operation that preserves your data and configuration. The key to a smooth move is preparation: verify tenant alignment, register resource providers, check quotas, identify all dependent resources, and validate before executing. Take the time to plan the post-move cleanup for monitoring, RBAC, and automation, and the whole process can be completed in under an hour with minimal disruption.
