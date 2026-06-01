# Validation Summary: How to Migrate Hyper-V Virtual Machines to Azure Using Azure Migrate

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Migrate Migration and modernization
- Hyper-V
- Azure Site Recovery Provider
- Recovery Services agent
- Azure virtual machines and managed disks
- Azure Storage accounts
- Azure Virtual Network
- Azure CLI
- Windows PowerShell
- .NET Framework

## Sources Consulted
- Microsoft Learn: Support for Hyper-V migration in Azure Migrate - https://learn.microsoft.com/en-us/azure/migrate/migrate-support-matrix-hyper-v-migration
- Microsoft Learn: Migrate Hyper-V VMs to Azure with the Migration and modernization tool - https://learn.microsoft.com/en-us/azure/migrate/tutorial-migrate-hyper-v
- Microsoft Learn: How does Hyper-V replication work? - https://learn.microsoft.com/en-us/azure/migrate/hyper-v-migration-architecture
- Microsoft Learn: Migrate Hyper-V servers to Azure by using Private Link - https://learn.microsoft.com/en-us/azure/migrate/migrate-hyper-v-servers-to-azure-using-private-link
- Microsoft Learn: Determine which .NET Framework versions are installed - https://learn.microsoft.com/en-us/dotnet/framework/migration-guide/how-to-determine-which-versions-are-installed
- Microsoft Learn: Azure CLI az network vnet reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet
- Microsoft Learn: Azure CLI az storage account reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Create an Azure storage account - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create

## Issues Found
- The post said the Hyper-V provider alone captures and replicates VM changes. Updated the architecture description to include the Recovery Services agent, which Microsoft documents as handling data replication with the provider.
- The post said there is no separate appliance VM for Hyper-V without clarifying the migration scope. Updated this to "no separate migration appliance VM" to avoid confusion with Azure Migrate discovery and assessment appliances.
- The post claimed Hyper-V hosts need about 600 MB of local cache per replicated VM. Microsoft documents snapshot and Hyper-V Replica log file usage on the host, with space dependent on VM size, churn, and replication duration. Replaced the fixed-size estimate.
- The .NET Framework prerequisite was listed as 4.7.2 or later with release value 461808. Microsoft lists .NET Framework 4.7 or later for Hyper-V migration, so the requirement and registry threshold were changed to 4.7 / 460798.
- The provider registration flow omitted target resource creation and the "Finalize registration" action. Added those steps to match the Azure Migrate portal workflow.
- The Azure CLI VNet example used older singular address prefix parameters. Updated the example to use current documented `--address-prefixes` and `--subnet-prefixes` parameters.
- The storage account CLI example omitted current secure defaults. Added `--kind StorageV2`, `--min-tls-version TLS1_2`, and `--allow-blob-public-access false`.
- The test migration step referred to a specific "Protected" status. Reworded this to the documented condition: initial replication has finished and delta replication has begun.
- The post said stopping replication removes cache storage. Microsoft documents that stopping replication removes replication state information; cache storage account cleanup is separate. Corrected the cleanup guidance.
- The bulk migration section claimed Azure Migrate supports up to 300 VMs simultaneously per project. Microsoft documents selecting up to 10 Hyper-V VMs at a time for replication, so the batch guidance was corrected.
- The troubleshooting endpoint list was incomplete. Added the required public cloud endpoints documented by Microsoft.
- The boot troubleshooting note tied boot disk support to the VM size. Reworded it to check Azure Migrate OS disk limits and target VM disk count/storage requirements.

## Review Notes
The post is technically relevant and now matches current Microsoft documentation for Hyper-V migration with Azure Migrate. Some portal labels can vary as Microsoft updates the Azure portal, but the corrected workflow and constraints align with the documented process as of 2026-06-01.
