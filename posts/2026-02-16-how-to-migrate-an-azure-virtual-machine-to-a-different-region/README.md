# How to Migrate an Azure Virtual Machine to a Different Region

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Migration, Azure Site Recovery, Region Migration, Azure CLI, Cloud Infrastructure

Description: A comprehensive guide to migrating Azure VMs between regions using Azure Site Recovery, snapshots, and managed disk copies.

---

There are plenty of reasons to move a VM to a different Azure region. Maybe you are expanding to serve users in a new geography, consolidating infrastructure after an acquisition, or responding to compliance requirements that mandate data residency. Whatever the reason, Azure does not have a simple "move VM to region X" button. You need to use one of several approaches, each with its own trade-offs.

In this guide, I will cover the three main methods: Azure Site Recovery, snapshot-based migration (good for one-off moves), and Azure Resource Mover (Microsoft's recommended hub for region moves).

## Understanding the Challenge

An Azure VM is not a single resource. It is a collection of interconnected resources:
- The VM resource itself
- OS disk and data disks
- Network interface(s)
- Virtual network and subnet
- Public IP address
- Network Security Group
- Availability set or zone assignment

When you move to a new region, you need to recreate all of these in the target region. The disks need to be copied, and the networking needs to be set up fresh. No existing resource can simply be moved - everything is created new.

## Method 1: Azure Site Recovery

Azure Site Recovery (ASR) is a solid approach for migrating production VMs when you want direct control of the replication and failover process. It provides continuous replication, minimal downtime during cutover, and a tested failover process.

### Setting Up Replication

First, create a Recovery Services vault in any supported region except the source region. Many teams place it in the target region:

```bash
# Create a Recovery Services vault in the target region

az backup vault create \
  --resource-group migrationRG \
  --name migrationVault \
  --location westus2
```

Enable replication for your VM through the portal (the CLI support for ASR replication is limited):

1. Navigate to your VM in the Azure portal.
2. Click "Disaster recovery" under "Operations."
3. Select the target region (e.g., West US 2).
4. Review the target settings - Azure can discover or create the target virtual network, but you should pre-create or select any other target resources you need.
5. Customize if needed (target VM size, availability options, disk type).
6. Click "Start replication."

ASR installs the Mobility Service agent on the VM and begins replicating disk data to the target region. Initial replication takes a while depending on disk size and available bandwidth.

### Monitoring Replication

Check the replication status:

```bash
# Check replication health via the Recovery Services vault
FABRIC_NAME="your-fabric-name"
CONTAINER_NAME="your-protection-container-name"

az site-recovery protected-item list \
  --resource-group migrationRG \
  --vault-name migrationVault \
  --fabric-name $FABRIC_NAME \
  --protection-container $CONTAINER_NAME \
  --query "[].{name:name, health:properties.replicationHealth, state:properties.protectionState}" \
  --output table
```

In the portal, the "Replicated items" section of the Recovery Services vault shows replication progress, health, and the latest recovery point.

### Performing the Migration

Once replication is fully synced:

1. In the Recovery Services vault, go to "Replicated items."
2. Select your VM.
3. Click "Failover."
4. Choose "Latest" as the recovery point.
5. Select "Shut down machine before beginning failover" to ensure data consistency.
6. Click "OK."

ASR creates the replica VM in the target region, but you still need to verify and recreate any dependent resources such as load balancers, public IP configuration, and other networking components that are not created automatically. After verifying everything works:

1. Click "Commit" to finish the move process.
2. Delete the original VM and its resources in the source region when you are confident the migration was successful.

## Method 2: Snapshot-Based Migration

For one-off migrations where you can tolerate more downtime, copying snapshots between regions is simpler:

### Step 1: Stop the VM

```bash
# Deallocate the VM to ensure disk consistency
az vm deallocate \
  --resource-group myResourceGroup \
  --name myVM
```

### Step 2: Create Snapshots

```bash
# Get the OS disk name
OS_DISK=$(az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query storageProfile.osDisk.name \
  --output tsv)

# Create a snapshot of the OS disk
az snapshot create \
  --resource-group myResourceGroup \
  --name myVM-os-snapshot \
  --source $OS_DISK \
  --location eastus

# If you have data disks, snapshot those too
DATA_DISKS=$(az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "storageProfile.dataDisks[].name" \
  --output tsv)

for DISK in $DATA_DISKS; do
  az snapshot create \
    --resource-group myResourceGroup \
    --name "${DISK}-snapshot" \
    --source $DISK \
    --location eastus
done
```

### Step 3: Copy Snapshots to the Target Region

```bash
# Get the snapshot ID
SNAPSHOT_ID=$(az snapshot show \
  --resource-group myResourceGroup \
  --name myVM-os-snapshot \
  --query id \
  --output tsv)

# Create a copy of the snapshot in the target region
az snapshot create \
  --resource-group targetResourceGroup \
  --name myVM-os-snapshot-copy \
  --source $SNAPSHOT_ID \
  --location westus2

# Copy the data disk snapshots too
for DISK in $DATA_DISKS; do
  DATA_SNAPSHOT_ID=$(az snapshot show \
    --resource-group myResourceGroup \
    --name "${DISK}-snapshot" \
    --query id \
    --output tsv)

  az snapshot create \
    --resource-group targetResourceGroup \
    --name "${DISK}-snapshot-copy" \
    --source $DATA_SNAPSHOT_ID \
    --location westus2
done
```

### Step 4: Create Disks from Snapshots

```bash
# Create an OS disk from the copied snapshot in the target region
az disk create \
  --resource-group targetResourceGroup \
  --name myVM-OsDisk \
  --source myVM-os-snapshot-copy \
  --location westus2 \
  --sku Premium_LRS

# Create managed disks from the copied data disk snapshots
for DISK in $DATA_DISKS; do
  az disk create \
    --resource-group targetResourceGroup \
    --name "${DISK}-copy" \
    --source "${DISK}-snapshot-copy" \
    --location westus2 \
    --sku Premium_LRS
done
```

### Step 5: Create the VM in the Target Region

```bash
# Create the network infrastructure in the target region
az network vnet create \
  --resource-group targetResourceGroup \
  --name targetVNet \
  --location westus2 \
  --address-prefix 10.0.0.0/16 \
  --subnet-name default \
  --subnet-prefix 10.0.1.0/24

# Create the VM using the copied OS disk
# Use --os-type Windows instead if the original VM is a Windows VM.
az vm create \
  --resource-group targetResourceGroup \
  --name myVM \
  --attach-os-disk myVM-OsDisk \
  --os-type Linux \
  --size Standard_D4s_v5 \
  --location westus2 \
  --vnet-name targetVNet \
  --subnet default
```

### Step 6: Attach Data Disks

```bash
# Attach any data disks you copied
for DISK in $DATA_DISKS; do
  az vm disk attach \
    --resource-group targetResourceGroup \
    --vm-name myVM \
    --name "${DISK}-copy"
done
```

## Method 3: Azure Resource Mover

Azure Resource Mover is a newer service designed specifically for cross-region moves. It orchestrates the entire process including dependency resolution.

1. In the Azure portal, search for "Azure Resource Mover."
2. Click "Add resources" and select the source and target regions.
3. Select the VM and its dependent resources (disks, NICs, NSGs, etc.).
4. Resource Mover analyzes dependencies and flags any issues.
5. Click "Prepare" to set up replication.
6. Once replicated, click "Initiate move."
7. After validation, click "Commit" to finalize.

Resource Mover uses ASR under the hood for VM replication but provides a simpler interface for the overall move process.

## Post-Migration Tasks

After the VM is running in the new region, there are several things to clean up:

**Update DNS records**: If your VM has a DNS name, update it to point to the new IP address.

```bash
# Update an Azure DNS record
NEW_IP="203.0.113.22"
OLD_IP="203.0.113.11"

az network dns record-set a add-record \
  --resource-group dnsResourceGroup \
  --zone-name example.com \
  --record-set-name myapp \
  --ipv4-address $NEW_IP

az network dns record-set a remove-record \
  --resource-group dnsResourceGroup \
  --zone-name example.com \
  --record-set-name myapp \
  --ipv4-address $OLD_IP
```

**Update application configurations**: Any hardcoded IP addresses or region-specific endpoints in your application need to be updated.

**Test thoroughly**: Verify that the application works correctly from the new region. Check latency to end users, database connectivity, and integration with other services.

**Clean up the source region**: Once you are confident the migration is successful, delete the original VM and all its resources:

```bash
# Delete the original resource group (if it contained only the migrated VM)
az group delete --name myResourceGroup --yes --no-wait
```

**Update monitoring and alerts**: Make sure your monitoring tools are pointed at the new VM. Azure Monitor alerts referencing the old resource ID need to be recreated.

## Choosing the Right Method

| Criteria | Azure Site Recovery | Snapshot Copy | Resource Mover |
|----------|-------------------|---------------|----------------|
| Downtime | Minutes | Hours | Minutes |
| Complexity | Medium | Low | Low |
| Automation | Good | Manual | Good |
| Dependency handling | Manual | Manual | Automatic |
| Best for | Direct replication control | One-off migrations | Production region moves |

For production workloads, start with Azure Resource Mover because it provides a guided move workflow with dependency handling and uses Site Recovery on the backend for VM replication. Use Azure Site Recovery directly when you want more control over the replication and failover process. For dev/test VMs or one-off migrations where downtime is acceptable, the snapshot method is simpler and faster to set up.

## Wrapping Up

Migrating an Azure VM between regions is not a single-click operation, but it is well-supported with multiple approaches. Azure Resource Mover provides the smoothest guided production migration with dependency handling. Azure Site Recovery gives you direct control over replication and failover, and snapshot-based migration gives you more control for simpler scenarios. Whichever method you choose, plan ahead, test in the target region before cutting over, and do not forget to clean up the source resources when you are done.
