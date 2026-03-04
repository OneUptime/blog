# How to Migrate Hyper-V Virtual Machines to Azure Using Azure Migrate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, Hyper-V, Cloud Migration, Azure, Virtual Machines, Windows Server, Replication

Description: Complete guide to migrating Hyper-V virtual machines to Azure using Azure Migrate, covering discovery, replication, test migration, and final cutover.

---

If your data center runs on Hyper-V, Azure Migrate provides a streamlined path to get those VMs running in Azure. The migration tool handles the heavy lifting of replicating disk data, creating Azure resources, and orchestrating the cutover. You do not need to rebuild anything from scratch or deal with manual disk exports.

This guide covers the entire process from initial setup through final cutover, including the often-overlooked test migration step that can save you from production outages.

## How the Hyper-V Migration Works

Azure Migrate uses a software-based replication provider that you install on each Hyper-V host. This provider captures changes at the disk level and replicates them to Azure Storage. Unlike VMware migration, there is no separate appliance VM required for Hyper-V. The provider runs directly on the host.

The high-level flow looks like this:

```mermaid
flowchart LR
    A[Hyper-V Host] -->|Install Provider| B[Azure Migrate Provider]
    B -->|Initial Replication| C[Azure Storage Account]
    C -->|Delta Sync| D[Managed Disks]
    D -->|Cutover| E[Azure VM]
```

Initial replication copies the full disk contents. After that, delta replication continuously sends only changed blocks. When you are ready to cut over, the final delta is applied, the on-premises VM is shut down, and an Azure VM boots from the replicated disks.

## Prerequisites

You will need:

- An Azure subscription with permissions to create VMs, storage accounts, and virtual networks
- Hyper-V hosts running Windows Server 2012 R2 or later
- The Hyper-V hosts must have outbound HTTPS connectivity to Azure
- VMs running any Windows or Linux OS supported by Azure
- An Azure Migrate project already created in the portal
- A target virtual network and subnet in Azure

The Hyper-V hosts should have enough free disk space for a local cache during replication. Plan for about 600 MB per VM being replicated.

## Step 1: Set Up the Azure Migrate Project

If you already have a project from the assessment phase, you can reuse it. Otherwise, create one now.

1. In the Azure portal, search for "Azure Migrate"
2. Click "Create project"
3. Select subscription, resource group, project name, and geography
4. Click "Create"

Then navigate to "Servers, databases and web apps" and under "Migration tools," you should see "Migration and modernization" already added. If not, click "Add tool" and select it.

## Step 2: Prepare the Hyper-V Hosts

Before installing the replication provider, prepare each Hyper-V host.

First, enable the required Windows features and firewall rules:

```powershell
# Enable WinRM for remote management (used during provider installation)
Enable-PSRemoting -Force

# Verify Hyper-V role is installed (should already be there)
Get-WindowsFeature -Name Hyper-V

# Open outbound HTTPS in Windows Firewall if not already allowed
New-NetFirewallRule -DisplayName "Azure Migrate Outbound HTTPS" `
    -Direction Outbound `
    -Protocol TCP `
    -RemotePort 443 `
    -Action Allow `
    -Profile Any

# Check .NET Framework version (4.7.2 or later required)
(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full").Release
# Value should be 461808 or higher for .NET 4.7.2+
```

Make sure the system clock is synchronized. Replication will fail if there is significant time drift between the host and Azure.

## Step 3: Register Hyper-V Hosts with Azure Migrate

1. In the Azure Migrate project, go to "Migration and modernization"
2. Click "Discover" and select "Hyper-V" as the virtualization type
3. Download the registration key file
4. Download the Azure Site Recovery Provider installer

Copy both files to each Hyper-V host and run the installer:

1. Execute the provider installer (AzureSiteRecoveryProvider.exe)
2. Accept the license terms
3. During registration, browse to the downloaded registration key file
4. Select the proxy settings if applicable
5. Complete the installation

The provider registers the Hyper-V host with your Azure Migrate project. After registration, the host and its VMs appear in the portal within 15-30 minutes.

## Step 4: Configure Target Azure Environment

Before starting replication, set up the Azure side. You need:

**Resource group** - Create or choose one for the migrated VMs.

**Virtual network** - The VMs need a network to land in. If you are setting up a hybrid connection (VPN or ExpressRoute), ensure it is ready.

**Storage account** - Azure Migrate creates a cache storage account for replication data. It picks one automatically, but you can specify your own if you need it in a particular region or with specific redundancy.

Here is how to prepare the target resources using Azure CLI:

```bash
# Create a resource group for migrated VMs
az group create \
    --name rg-migrated-workloads \
    --location eastus2

# Create a virtual network with a subnet
az network vnet create \
    --resource-group rg-migrated-workloads \
    --name vnet-migration \
    --address-prefix 10.1.0.0/16 \
    --subnet-name subnet-default \
    --subnet-prefix 10.1.0.0/24

# Create a cache storage account (standard LRS is fine for cache)
az storage account create \
    --resource-group rg-migrated-workloads \
    --name stmigrationcache2026 \
    --sku Standard_LRS \
    --location eastus2
```

## Step 5: Start Replication

Now comes the main event. Select which VMs to replicate and configure how they should appear in Azure.

1. In the Azure Migrate project, click "Replicate"
2. Select "Hyper-V" as the source
3. Choose the target region, subscription, and resource group
4. Select the VMs to replicate
5. For each VM, configure:
   - Target VM name
   - Target VM size (or let Azure Migrate auto-select based on assessment)
   - Target OS disk and data disks
   - Target virtual network and subnet
6. Click "Replicate"

Initial replication begins immediately. Depending on disk sizes and network bandwidth, it can take hours to days. A 100 GB disk on a 100 Mbps connection takes roughly 2-3 hours for initial replication.

Monitor replication status in the portal. Each VM shows its replication health and the percentage of initial replication completed. Once initial replication finishes, delta replication kicks in automatically.

## Step 6: Perform a Test Migration

Never skip this step. A test migration creates a copy of the VM in Azure without affecting the source VM or ongoing replication.

1. Wait for replication status to show "Protected" (initial replication complete)
2. Click on a replicating VM
3. Select "Test migration"
4. Choose a test virtual network (use a separate one to avoid IP conflicts)
5. Click "Test migration"

Azure creates a temporary VM from the latest replicated data. Once it boots, verify:

- The VM starts successfully
- The operating system loads properly
- Applications function correctly
- Network connectivity works as expected
- Disk data is intact

After testing, clean up by clicking "Clean up test migration." This deletes the test VM and its resources.

## Step 7: Perform the Cutover

When you are satisfied with test results and ready for production migration:

1. Coordinate a maintenance window with stakeholders
2. Shut down the on-premises VM (this ensures no data is lost)
3. Wait for the final delta replication to complete (usually takes a few minutes)
4. In the Azure Migrate portal, click "Migrate" on the replicating VM
5. Select "Yes" to shut down the on-premises machine before migration (recommended)
6. Click "Migrate"

Azure Migrate applies the final delta, creates the Azure VM with the configured settings, and boots it. The entire cutover process typically takes 5-15 minutes per VM.

## Step 8: Post-Migration Steps

After the Azure VM is running, there are several things to take care of:

**Install the Azure VM agent.** If it was not already installed, add the Azure VM agent for Windows or the waagent for Linux. This enables Azure extensions and monitoring.

**Update DNS records.** Point DNS entries to the new Azure VM IP addresses.

**Verify backups.** Set up Azure Backup for the newly migrated VMs immediately. Do not leave them unprotected.

**Remove replication.** Once you have confirmed everything works, stop replication and clean up the Azure Migrate resources. This removes the cache storage and replication metadata.

**Decommission on-premises VMs.** Keep the source VMs turned off (but not deleted) for a rollback period, typically one to two weeks. After that, you can safely remove them.

## Handling Bulk Migrations

For environments with dozens or hundreds of VMs, you will want to batch your migrations. A good approach is:

1. Group VMs by application (using dependency analysis data)
2. Replicate all VMs in a group simultaneously
3. Test migrate the group together
4. Schedule cutover windows per group, starting with lower-risk applications

Azure Migrate supports replicating up to 300 VMs simultaneously per project. For larger environments, use multiple projects or stagger your replication waves.

## Troubleshooting Common Issues

**Replication stuck at a percentage.** Check network bandwidth between the Hyper-V host and Azure. Also verify the cache storage account is not throttled. Large VMs with high change rates may need a faster connection.

**Provider registration fails.** This is almost always a connectivity issue. Verify the Hyper-V host can reach `*.hypervrecoverymanager.windowsazure.com` and `*.blob.core.windows.net` on port 443.

**VM fails to boot after migration.** Check that the VM generation (Gen1 vs Gen2) is supported by the target Azure VM size. Also verify that the boot disk is not larger than the Azure VM size supports.

## Wrapping Up

Migrating Hyper-V VMs to Azure with Azure Migrate is a well-defined process: install the provider, replicate, test, and cut over. The replication is continuous, so you can take your time validating before committing. The test migration feature is particularly valuable because it lets you verify everything in Azure without risking your production environment. Plan your batches, schedule your maintenance windows, and let Azure Migrate handle the disk-level replication work.
