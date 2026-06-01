# How to Migrate VMware VMs to Azure Using Agentless Replication in Azure Migrate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, VMware, Agentless Migration, Cloud Migration, VM Replication, Datacenter Migration, Azure

Description: A practical guide to migrating VMware virtual machines to Azure using agentless replication in Azure Migrate, from discovery through cutover.

---

Migrating VMware virtual machines to Azure is one of the most common datacenter migration scenarios. Azure Migrate provides an agentless replication option that lets you replicate VMware VMs to Azure without installing anything on the VMs themselves. The replication happens at the hypervisor level through the VMware vSphere API, which makes it cleaner and less disruptive than agent-based approaches. This guide covers the end-to-end process from setting up the Azure Migrate appliance through performing the final cutover.

## Why Agentless Replication

With agent-based replication, you install a mobility agent on every VM you want to migrate. That means touching each VM individually, dealing with different operating systems and configurations, handling agent updates, and managing the inevitable cases where the agent does not install cleanly.

Agentless replication avoids all of that. The Azure Migrate appliance communicates with vCenter Server to replicate VM disks at the hypervisor level. No agents on the VMs, no reboots caused by migration tooling, fewer in-guest compatibility issues. The trade-off is that this VMware agentless workflow only works with supported VMware vSphere versions (vCenter Server and ESXi 6.5, 6.7, 7.0, or 8.0). Hyper-V has its own agentless migration path, while physical servers and most other platforms need the agent-based approach.

## Prerequisites

- Supported VMware vCenter Server and ESXi versions: 6.5, 6.7, 7.0, or 8.0
- An Azure subscription with the Azure Migrate project created
- Network connectivity between the on-premises VMware environment and Azure
- A VMware account with the required Azure Migrate replication permissions, including snapshot management, changed block tracking, disk lease, and disk read permissions
- Azure Migrate Owner or Azure Migrate Execute Expert permissions on the Azure Migrate project resource group and target resource group, plus permissions to create VMs and write to managed disks

## Step 1: Create an Azure Migrate Project

```bash
# Create the Azure Migrate project

RESOURCE_GROUP="rg-migration"
PROJECT_NAME="datacenter-migration-2026"
LOCATION="centralus"
SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"

az group create --name $RESOURCE_GROUP --location $LOCATION

# Create the Azure Migrate project with the Azure Resource Manager REST API
az rest --method put \
    --url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Migrate/MigrateProjects/${PROJECT_NAME}?api-version=2018-09-01-preview" \
    --body "{\"location\":\"${LOCATION}\",\"properties\":{}}"
```

## Step 2: Deploy the Azure Migrate Appliance

The Azure Migrate appliance is a lightweight VM that runs in your VMware environment. It discovers VMs, collects performance data, and orchestrates replication.

### Download and Deploy the Appliance

1. In the Azure portal, go to your Azure Migrate project
2. Under "Servers, databases and web apps," go to "Azure Migrate: Discovery and assessment" and click "Discover"
3. Select "Yes, with VMware vSphere hypervisor"
4. Generate a project key, then download the OVA template for the appliance

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

After the appliance is configured and vCenter Server details are added, it starts discovering VMs. Configuration metadata is collected and sent about every 15 minutes, performance metadata is collected about every 50 minutes, and software inventory data is sent about every 24 hours:

```bash
# List discovered VMware servers with the Azure CLI migrate extension
az migrate get-discovered-server \
    --project-name $PROJECT_NAME \
    --resource-group $RESOURCE_GROUP \
    --source-machine-type VMware
```

The appliance discovers:
- VM configuration (CPU, memory, disks, network adapters)
- Performance data (CPU utilization, memory usage, disk IOPS, network throughput)
- Guest operating system information
- Running applications and dependencies (if VM credentials were provided)

## Step 4: Assess VMs for Migration

Before migrating, run an assessment to check Azure readiness and get sizing recommendations. In the Azure portal, go to the Infrastructure tab, select the discovered VMs you want to assess, click "Create assessment," choose an Azure VM assessment, and set the sizing criterion to performance-based if you want recommendations based on collected utilization data.

The assessment tells you:
- Which VMs are ready for Azure and which have issues (unsupported configurations, boot types, etc.)
- Recommended Azure VM sizes based on actual performance data
- Estimated monthly cost in Azure
- Any migration blockers that need to be resolved first

Review the assessment results carefully. Common issues include:
- VMs with more than 64 data disks
- VMs with OS disks larger than 2 TB for generation 1 or 4 TB for generation 2, or data disks larger than 32 TB
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
- **Storage account**: Log storage account used for replication data
- **Target VM size**: Based on the assessment recommendation or manually chosen
- **Disk type**: Standard HDD, Standard SSD, or Premium SSD for managed disks

The agentless replication process works like this:

1. Azure Migrate creates a VMware snapshot for each VM disk
2. The appliance reads the disk data using VMware changed block tracking and uploads it to Azure storage
3. The initial replication transfers the full disk contents
4. Subsequent cycles transfer only the changed blocks (delta replication)
5. After the first delta cycle, later delta cycles are scheduled no sooner than 1 hour and no later than 12 hours, based on the previous delta cycle time

## Step 6: Monitor Replication

Track replication progress and health:

```powershell
# Check replication status for all VMs
# Look for DeltaReplication Completed, which means initial replication is complete
Get-AzMigrateServerMigrationStatus `
    -ProjectName "datacenter-migration-2026" `
    -ResourceGroupName "rg-migration"
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
2. Shut down the source VM to avoid data loss
3. Wait for the final replication cycle to complete
4. Trigger the cutover in Azure Migrate

```bash
# The cutover process:
# 1. Final delta replication syncs the latest changes
# 2. Azure Migrate creates the Azure VM from the replicated data
# 3. The Azure VM starts and gets its network configuration
# 4. Update DNS records to point to the new Azure VM
# 5. Verify everything works
# 6. Complete the migration in Azure Migrate to clean up replication resources
# 7. Decommission the source VM after a stability period
```

## Post-Migration Steps

After migration, complete these tasks:

- Install the Azure VM agent (it may not be present on migrated VMs)
- Enable Azure Backup for the migrated VMs
- Configure Network Security Groups for proper access control
- Update monitoring to cover the new Azure VMs
- Adjust any firewall rules that referenced the old IP addresses
- Complete the migration in Azure Migrate if you did not already do so during cutover
- Update documentation to reflect the new infrastructure

## Summary

Agentless VMware migration with Azure Migrate provides a clean, non-disruptive path from on-premises VMware to Azure. The Azure Migrate appliance handles discovery and replication through the vSphere API, with no agents needed on the VMs themselves. The process follows a clear sequence: discover, assess, replicate, test, and cut over. Take the assessment seriously to catch issues early, always run test migrations before the real cutover, and plan for a maintenance window even though the replication minimizes the actual downtime.
