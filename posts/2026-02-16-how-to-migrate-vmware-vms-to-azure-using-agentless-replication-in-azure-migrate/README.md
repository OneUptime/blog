# How to Migrate VMware VMs to Azure Using Agentless Replication in Azure Migrate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, VMware, Agentless Migration, Cloud Migration, VM Replication, Datacenter Migration, Azure

Description: A practical guide to migrating VMware virtual machines to Azure using agentless replication in Azure Migrate, from discovery through cutover.

---

Migrating VMware virtual machines to Azure is one of the most common datacenter migration scenarios. Azure Migrate provides an agentless replication option that lets you replicate VMware VMs to Azure without installing anything on the VMs themselves. The replication happens at the hypervisor level through the VMware vSphere API, which makes it cleaner and less disruptive than agent-based approaches. This guide covers the end-to-end process from setting up the Azure Migrate appliance through performing the final cutover.

## Why Agentless Replication

With agent-based replication, you install a mobility agent on every VM you want to migrate. That means touching each VM individually, dealing with different operating systems and configurations, handling agent updates, and managing the inevitable cases where the agent does not install cleanly.

Agentless replication avoids all of that. The Azure Migrate appliance communicates with vCenter Server to replicate VM disks at the hypervisor level. No agents on the VMs, no reboots, no compatibility issues. The trade-off is that agentless replication only works with VMware (vSphere 6.0+). If you are migrating from Hyper-V or physical servers, you need the agent-based approach.

## Prerequisites

- VMware vCenter Server 6.0 or later
- An Azure subscription with the Azure Migrate project created
- Network connectivity between the on-premises VMware environment and Azure
- A VMware account with at least read-only permissions (and disk snapshot permissions for replication)
- Azure permissions to create VMs, disks, and managed disks in the target resource group

## Step 1: Create an Azure Migrate Project

```bash
# Create the Azure Migrate project
RESOURCE_GROUP="rg-migration"
PROJECT_NAME="datacenter-migration-2026"
LOCATION="eastus"

az group create --name $RESOURCE_GROUP --location $LOCATION

# Create the Azure Migrate project
az migrate project create \
    --name $PROJECT_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION
```

## Step 2: Deploy the Azure Migrate Appliance

The Azure Migrate appliance is a lightweight VM that runs in your VMware environment. It discovers VMs, collects performance data, and orchestrates replication.

### Download and Deploy the Appliance

1. In the Azure portal, go to your Azure Migrate project
2. Under "Migration tools," click "Discover"
3. Select "VMware" and "Agentless"
4. Download the OVA template for the appliance

Deploy the OVA in vCenter:

```powershell
# Using PowerCLI to deploy the appliance OVA
# Connect to vCenter
Connect-VIServer -Server vcenter.mycompany.com -User admin@vsphere.local

# Deploy the OVA template
$ovfConfig = Get-OvfConfiguration -Ovf "AzureMigrateAppliance.ova"

# Set the network mapping
$ovfConfig.NetworkMapping.VM_Network.Value = "Management-Network"

# Deploy the VM
Import-VApp -Source "AzureMigrateAppliance.ova" `
    -OvfConfiguration $ovfConfig `
    -Name "AzureMigrateAppliance" `
    -VMHost (Get-VMHost "esxi-host-01.mycompany.com") `
    -Datastore (Get-Datastore "datastore-ssd") `
    -DiskStorageFormat Thin

# Start the appliance
Start-VM -VM "AzureMigrateAppliance"
```

### Configure the Appliance

Once the appliance VM is running, open a browser and navigate to `https://<appliance-ip>:44368` to run the configuration wizard:

1. Set up the appliance name and check connectivity to Azure
2. Register the appliance with your Azure Migrate project using the project key
3. Add vCenter Server credentials (the appliance uses these to discover and replicate VMs)
4. Optionally add VM credentials for application discovery (this identifies what software is running on each VM)

## Step 3: Discover VMware VMs

After the appliance is configured, it starts discovering VMs automatically. The discovery runs every 24 hours, but you can trigger an immediate scan:

```bash
# Check discovery status through the Azure portal or REST API
# The discovery typically takes 15-30 minutes for the first scan
az migrate assessment list \
    --project-name $PROJECT_NAME \
    --resource-group $RESOURCE_GROUP
```

The appliance discovers:
- VM configuration (CPU, memory, disks, network adapters)
- Performance data (CPU utilization, memory usage, disk IOPS, network throughput)
- Guest operating system information
- Running applications and dependencies (if VM credentials were provided)

## Step 4: Assess VMs for Migration

Before migrating, run an assessment to check Azure readiness and get sizing recommendations:

```bash
# Create a migration assessment
az migrate assessment create \
    --project-name $PROJECT_NAME \
    --resource-group $RESOURCE_GROUP \
    --name "vmware-assessment-01" \
    --sizing-criterion "PerformanceBased" \
    --time-range "Month" \
    --percentile "Percentile95" \
    --vm-uptime-per-day 18 \
    --vm-uptime-per-month 26
```

The assessment tells you:
- Which VMs are ready for Azure and which have issues (unsupported configurations, boot types, etc.)
- Recommended Azure VM sizes based on actual performance data
- Estimated monthly cost in Azure
- Any migration blockers that need to be resolved first

Review the assessment results carefully. Common issues include:
- VMs with more than 64 disks (Azure limit)
- VMs with disks larger than 32 TB
- VMs using hardware that does not have an Azure equivalent
- VMs with incompatible guest operating systems

## Step 5: Set Up Replication

Once you have addressed any assessment issues, start replication for the VMs you want to migrate:

```bash
# The replication is typically configured through the Azure portal
# but you can also use the REST API

# In the portal:
# 1. Go to Azure Migrate > Servers > Migration tools
# 2. Click "Replicate"
# 3. Select "VMware - Agentless"
# 4. Choose the VMs to replicate
# 5. Configure target settings (resource group, VNet, subnet, storage)
```

For each VM, you configure:
- **Target resource group**: Where the Azure VM will be created
- **Target virtual network and subnet**: Network placement in Azure
- **Storage account**: Staging storage for replication data
- **Target VM size**: Based on the assessment recommendation or manually chosen
- **OS disk type**: Standard HDD, Standard SSD, or Premium SSD

The agentless replication process works like this:

1. The appliance takes a snapshot of each VM disk via the vSphere API
2. It reads the changed blocks and uploads them to Azure storage
3. The initial replication transfers the full disk contents
4. Subsequent cycles transfer only the changed blocks (delta replication)
5. Delta replication runs every 5 minutes by default

## Step 6: Monitor Replication

Track replication progress and health:

```bash
# Check replication status for all VMs
# Look for "Protected" status, which means initial replication is complete
az resource list \
    --resource-group $RESOURCE_GROUP \
    --resource-type "Microsoft.RecoveryServices/vaults/replicationFabrics/replicationProtectionContainers/replicationProtectedItems" \
    --query "[].{Name:name, Status:properties.protectionState}" \
    -o table
```

Initial replication can take hours or days depending on disk sizes and upload bandwidth. A VM with 500 GB of disk data on a 100 Mbps connection takes roughly 11 hours for the initial sync.

## Step 7: Run a Test Migration

Before doing the actual cutover, always run a test migration:

```bash
# Test migration creates a test VM in Azure from the replicated data
# It does not affect the source VM or the replication

# In the Azure portal:
# 1. Go to the replicated VM
# 2. Click "Test migration"
# 3. Select a test virtual network (isolated from production)
# 4. Wait for the test VM to be created
# 5. Verify the test VM works correctly
# 6. Clean up by clicking "Clean up test migration"
```

Test migration is not optional. I have seen migrations fail because of driver issues, boot configuration problems, and networking mismatches that were only caught during test migration. Spend the time to verify each VM works in Azure before the real cutover.

Things to check during test migration:
- VM boots successfully
- Operating system loads and you can log in
- Network interfaces get the expected IP addresses
- Applications start correctly
- Database connectivity works
- DNS resolution functions properly

## Step 8: Perform the Cutover

When you are ready for the actual migration:

1. Schedule a maintenance window and notify stakeholders
2. Stop the source VM (optional but recommended to avoid data loss)
3. Wait for the final replication cycle to complete
4. Trigger the cutover in Azure Migrate

```bash
# The cutover process:
# 1. Final delta replication syncs the latest changes
# 2. Azure Migrate creates the Azure VM from the replicated data
# 3. The Azure VM starts and gets its network configuration
# 4. Update DNS records to point to the new Azure VM
# 5. Verify everything works
# 6. Decommission the source VM after a stability period
```

## Post-Migration Steps

After migration, complete these tasks:

- Install the Azure VM agent (it may not be present on migrated VMs)
- Enable Azure Backup for the migrated VMs
- Configure Network Security Groups for proper access control
- Update monitoring to cover the new Azure VMs
- Adjust any firewall rules that referenced the old IP addresses
- Update documentation to reflect the new infrastructure

## Summary

Agentless VMware migration with Azure Migrate provides a clean, non-disruptive path from on-premises VMware to Azure. The Azure Migrate appliance handles discovery and replication through the vSphere API, with no agents needed on the VMs themselves. The process follows a clear sequence: discover, assess, replicate, test, and cut over. Take the assessment seriously to catch issues early, always run test migrations before the real cutover, and plan for a maintenance window even though the replication minimizes the actual downtime.
