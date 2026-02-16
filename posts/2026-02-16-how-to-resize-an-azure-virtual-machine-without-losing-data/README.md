# How to Resize an Azure Virtual Machine Without Losing Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, VM Resize, Cloud Computing, Cost Optimization, Azure CLI, Infrastructure

Description: Learn how to safely resize an Azure Virtual Machine to a different SKU without losing data, including downtime considerations and best practices.

---

There comes a point in every project where the VM you started with is no longer the right fit. Maybe your application needs more memory, or you over-provisioned and want to cut costs. Azure makes it possible to resize a VM to a different SKU, and the good news is that your data stays intact throughout the process. The not-so-good news is that there is a reboot involved, so you need to plan for a brief window of downtime.

In this post, I will cover the full process of resizing an Azure VM, what to watch out for, and how to minimize disruption.

## How VM Resizing Works

When you resize a VM in Azure, the platform deallocates the virtual machine, changes the underlying hardware allocation, and then starts it back up. Your OS disk and data disks remain attached. The public IP address stays the same if you are using a static IP. If you are using a dynamic IP, it may change after the restart.

The key thing to understand is that not all VM sizes are available on every hardware cluster. If the new size you want is not available on the current cluster, Azure needs to move the VM to a different cluster. This still preserves your data, but the operation takes longer.

## Checking Available Sizes

Before attempting a resize, check which sizes are available for your current VM. This matters because the list of compatible sizes depends on the hardware cluster where your VM is currently running.

```bash
# List all VM sizes available for the current VM's hardware cluster
az vm list-vm-resize-options \
  --resource-group myResourceGroup \
  --name myVM \
  --output table
```

This command returns every size that the VM can be resized to without needing to be moved to a different cluster. If the size you want is in this list, the resize will be faster.

If you do not see the size you need, you can check all sizes available in the region:

```bash
# List all sizes available in the region
az vm list-sizes \
  --location eastus \
  --output table
```

If your desired size exists in the region but not in the resize options list, you will need to deallocate the VM first. Deallocation releases the VM from its current cluster, allowing Azure to place it on a cluster that supports the new size.

## Understanding VM Size Families

Azure VM sizes follow a naming convention that tells you what the VM is optimized for. Here is a quick breakdown:

- **B-series** (e.g., Standard_B2s): Burstable VMs for workloads that do not need full CPU continuously.
- **D-series** (e.g., Standard_D4s_v5): General purpose, good balance of CPU and memory.
- **E-series** (e.g., Standard_E8s_v5): Memory optimized for databases and caching.
- **F-series** (e.g., Standard_F4s_v2): Compute optimized for CPU-intensive workloads.
- **N-series** (e.g., Standard_NC6s_v3): GPU-enabled for machine learning and rendering.

The "s" in the name indicates support for Premium SSD storage. Always prefer sizes with the "s" suffix if you are using premium disks.

## Resizing When the Target Size Is Available

If the target size showed up in the `list-vm-resize-options` output, you can resize directly. The VM will restart automatically.

```bash
# Resize the VM to a new size (causes a reboot)
az vm resize \
  --resource-group myResourceGroup \
  --name myVM \
  --size Standard_D4s_v5
```

This command initiates the resize, which involves a restart. Expect roughly 2 to 5 minutes of downtime depending on the VM size and OS.

## Resizing When the Target Size Is Not Available

If your target size was not in the resize options, you need to deallocate first:

```bash
# Deallocate the VM to release it from the current hardware cluster
az vm deallocate \
  --resource-group myResourceGroup \
  --name myVM

# Now resize to the desired size
az vm resize \
  --resource-group myResourceGroup \
  --name myVM \
  --size Standard_E8s_v5

# Start the VM back up
az vm start \
  --resource-group myResourceGroup \
  --name myVM
```

When you deallocate, the VM stops and Azure releases the compute resources. You are not billed for compute while deallocated, only for storage. Once you resize and start the VM, it gets placed on a cluster that supports the new size.

## Resizing via the Azure Portal

If you prefer the portal, the process is straightforward:

1. Navigate to your virtual machine in the Azure portal.
2. Click on "Size" under the Settings section in the left menu.
3. Browse the available sizes. The portal shows which sizes are available without deallocation and which require it.
4. Select the new size and click "Resize."
5. If deallocation is required, the portal will prompt you.

The portal gives you a nice comparison view showing CPU, memory, and pricing for each size, which helps when you are deciding what to move to.

## Resizing VMs in an Availability Set

If your VM is part of an availability set, the resize process has an extra wrinkle. All VMs in the availability set must support the target size, or you need to deallocate all of them before resizing.

```bash
# Deallocate all VMs in the availability set
az vm deallocate --ids $(az vm list \
  --resource-group myResourceGroup \
  --query "[?availabilitySet].id" \
  --output tsv)

# Resize each VM individually
az vm resize \
  --resource-group myResourceGroup \
  --name myVM1 \
  --size Standard_D4s_v5

az vm resize \
  --resource-group myResourceGroup \
  --name myVM2 \
  --size Standard_D4s_v5

# Start all VMs back up
az vm start --resource-group myResourceGroup --name myVM1
az vm start --resource-group myResourceGroup --name myVM2
```

This is one of those situations where having a load balancer in front of your VMs pays off. You can resize them one at a time by draining connections to each VM before deallocating it.

## Things That Can Go Wrong

There are a few scenarios to watch out for:

**Temporary disk loss**: Some VM sizes come with a local temporary disk (the D: drive on Windows or /dev/sdb on Linux). If you move to a size that has a different temporary disk configuration, the data on that disk is lost. Never store anything important on the temporary disk.

**IP address changes**: If you are using a dynamic public IP, it may change after deallocation. Switch to a static IP before resizing if you cannot afford an IP change.

**Quota limits**: Your subscription has quota limits for each VM family in each region. If you are moving to a size in a family you have not used before, you might hit a quota limit. Check your quotas:

```bash
# Check current VM quota usage in a region
az vm list-usage --location eastus --output table
```

**Disk compatibility**: Premium SSD disks require VM sizes that support premium storage (the ones with "s" in the name). If you try to resize to a size without premium storage support while using premium disks, the operation will fail.

## Automating Resizes with Scripts

For production environments, you might want to automate the resize with notifications. Here is a simple bash script that handles the full process:

```bash
#!/bin/bash
# Script to safely resize an Azure VM with status checks

RESOURCE_GROUP="myResourceGroup"
VM_NAME="myVM"
NEW_SIZE="Standard_D4s_v5"

# Check if the new size is available without deallocation
AVAILABLE=$(az vm list-vm-resize-options \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --query "[?name=='$NEW_SIZE'].name" \
  --output tsv)

if [ -n "$AVAILABLE" ]; then
    echo "Target size is available on the current cluster. Resizing directly..."
    az vm resize \
      --resource-group $RESOURCE_GROUP \
      --name $VM_NAME \
      --size $NEW_SIZE
else
    echo "Target size requires deallocation. Deallocating first..."
    az vm deallocate --resource-group $RESOURCE_GROUP --name $VM_NAME
    az vm resize --resource-group $RESOURCE_GROUP --name $VM_NAME --size $NEW_SIZE
    az vm start --resource-group $RESOURCE_GROUP --name $VM_NAME
fi

# Verify the new size
CURRENT_SIZE=$(az vm show \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --query hardwareProfile.vmSize \
  --output tsv)

echo "VM is now running on size: $CURRENT_SIZE"
```

## Minimizing Downtime

A few strategies to keep disruption to a minimum:

1. **Schedule the resize during low-traffic periods.** This seems obvious, but it is easy to forget when you are in a hurry.
2. **Use a load balancer with multiple VMs.** Resize one VM at a time while the others handle traffic.
3. **Set up health probes.** Your load balancer should detect when a VM goes down and stop routing traffic to it automatically.
4. **Notify your team.** Even a 3-minute outage can cause confusion if nobody knows it is happening.

## Wrapping Up

Resizing an Azure VM is a safe operation that preserves all your disk data. The main trade-off is a brief period of downtime during the restart. Plan ahead by checking available sizes, understanding your disk and IP configuration, and scheduling the change during a maintenance window. With a bit of preparation, the resize itself takes just a few minutes and your workload is back up and running on its new hardware.
