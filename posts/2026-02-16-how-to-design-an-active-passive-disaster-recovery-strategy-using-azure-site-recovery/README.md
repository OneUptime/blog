# How to Design an Active-Passive Disaster Recovery Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Disaster Recovery, Site Recovery, Active-Passive, Business Continuity, Replication, High Availability

Description: Design and implement an active-passive disaster recovery strategy using Azure Site Recovery to protect your workloads from regional outages.

---

Not every application needs the complexity and cost of an active-active multi-region deployment. For many workloads, an active-passive disaster recovery (DR) strategy provides the right balance between cost and resilience. In this model, your primary region handles all traffic during normal operations, while a secondary region stays ready to take over if the primary fails.

Azure Site Recovery (ASR) is the core service that makes this work. It continuously replicates your virtual machines, disks, and configurations to the secondary region, and orchestrates the failover process when disaster strikes.

## Understanding RPO and RTO

Before designing your DR strategy, you need to define two key metrics with your business:

**Recovery Point Objective (RPO)** - how much data loss is acceptable. An RPO of 1 hour means you can tolerate losing up to 1 hour of data. Azure Site Recovery typically provides an RPO of a few minutes for VM replication.

**Recovery Time Objective (RTO)** - how long the application can be down. An RTO of 30 minutes means the application must be back online within 30 minutes of a failure. ASR can achieve RTOs of 15-30 minutes for properly configured workloads.

```mermaid
flowchart LR
    subgraph "Normal Operations"
        direction TB
        A[Users] --> B[Primary Region - East US]
        B -->|Continuous Replication| C[Secondary Region - West US]
        style C fill:#f9f,stroke:#333,stroke-dasharray: 5 5
    end
```

```mermaid
flowchart LR
    subgraph "During Failover"
        direction TB
        A[Users] --> C[Secondary Region - West US]
        B[Primary Region - East US]
        style B fill:#f66,stroke:#333
        style C fill:#6f6,stroke:#333
    end
```

## Setting Up Azure Site Recovery

### Create the Recovery Services Vault

The vault is the management container for your DR configuration:

```bash
# Create a Recovery Services vault in the secondary region

az backup vault create \
  --resource-group dr-rg \
  --name my-recovery-vault \
  --location westus

# Alternatively, create the Recovery Services vault as an ARM resource
az resource create \
  --resource-group dr-rg \
  --name my-recovery-vault \
  --resource-type Microsoft.RecoveryServices/vaults \
  --location westus \
  --is-full-object \
  --properties '{
    "location": "westus",
    "sku": {"name": "RS0", "tier": "Standard"},
    "properties": {}
  }'
```

### Enable Replication for Virtual Machines

Configure replication for each VM that needs DR protection:

```bash
# Enable replication using the portal is often easier for the initial setup
# But here is the CLI approach for Azure-to-Azure VM replication
az site-recovery protected-item create \
  --resource-group dr-rg \
  --vault-name my-recovery-vault \
  --fabric-name "azure-eastus" \
  --protection-container "azure-eastus-container" \
  --name "web-server-01-replication" \
  --policy-id "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationPolicies/24-hour-retention" \
  --provider-details '{
    a2a: {
      fabric-object-id: "/subscriptions/{sub}/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/web-server-01",
      vm-managed-disks: [
        {
          disk-id: "/subscriptions/{sub}/resourceGroups/prod-rg/providers/Microsoft.Compute/disks/web-server-01-osdisk",
          primary-staging-azure-storage-account-id: "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.Storage/storageAccounts/asrstagingeastus",
          recovery-resource-group-id: "/subscriptions/{sub}/resourceGroups/dr-prod-rg"
        }
      ],
      recovery-azure-network-id: "/subscriptions/{sub}/resourceGroups/dr-prod-rg/providers/Microsoft.Network/virtualNetworks/dr-vnet",
      recovery-container-id: "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-westus/replicationProtectionContainers/azure-westus-container",
      recovery-resource-group-id: "/subscriptions/{sub}/resourceGroups/dr-prod-rg",
      recovery-subnet-name: "default"
    }
  }'
```

### Configure Replication Policy

The replication policy defines how frequently snapshots are taken and how long recovery points are retained:

```bash
# Create a replication policy
az site-recovery policy create \
  --resource-group dr-rg \
  --vault-name my-recovery-vault \
  --name "standard-dr-policy" \
  --provider-specific-input '{
    a2a: {
      app-consistent-frequency-in-minutes: 60,
      crash-consistent-frequency-in-minutes: 5,
      recovery-point-history: 1440,
      multi-vm-sync-status: Enable
    }
  }'
```

This policy takes crash-consistent snapshots every 5 minutes (giving you an RPO of about 5 minutes), application-consistent snapshots every hour, and retains recovery points for 24 hours.

## Recovery Plans

A recovery plan defines the order in which VMs start during failover. This is critical because database servers need to start before application servers, and application servers need to start before web servers.

```bash
az site-recovery recovery-plan create \
  --resource-group dr-rg \
  --vault-name my-recovery-vault \
  --name my-recovery-plan \
  --primary-fabric-id "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-eastus" \
  --recovery-fabric-id "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-westus" \
  --failover-deployment-model ResourceManager \
  --groups '[
    {
      group-type: Boot,
      replication-protected-items: [
        {id: "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-eastus/replicationProtectionContainers/azure-eastus-container/replicationProtectedItems/sql-server-01-replication", virtual-machine-id: "/subscriptions/{sub}/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/sql-server-01"},
        {id: "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-eastus/replicationProtectionContainers/azure-eastus-container/replicationProtectedItems/sql-server-02-replication", virtual-machine-id: "/subscriptions/{sub}/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/sql-server-02"}
      ]
    },
    {
      group-type: Boot,
      replication-protected-items: [
        {id: "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-eastus/replicationProtectionContainers/azure-eastus-container/replicationProtectedItems/app-server-01-replication", virtual-machine-id: "/subscriptions/{sub}/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/app-server-01"},
        {id: "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-eastus/replicationProtectionContainers/azure-eastus-container/replicationProtectedItems/app-server-02-replication", virtual-machine-id: "/subscriptions/{sub}/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/app-server-02"}
      ]
    },
    {
      group-type: Boot,
      replication-protected-items: [
        {id: "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-eastus/replicationProtectionContainers/azure-eastus-container/replicationProtectedItems/web-server-01-replication", virtual-machine-id: "/subscriptions/{sub}/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/web-server-01"},
        {id: "/subscriptions/{sub}/resourceGroups/dr-rg/providers/Microsoft.RecoveryServices/vaults/my-recovery-vault/replicationFabrics/azure-eastus/replicationProtectionContainers/azure-eastus-container/replicationProtectedItems/web-server-02-replication", virtual-machine-id: "/subscriptions/{sub}/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/web-server-02"}
      ]
    }
  ]'
```

Post-actions such as "WaitForSQLReady" and "UpdateAppConfig" can be added to the recovery plan in the Azure portal by attaching Azure Automation runbooks to the appropriate group.

## DNS Failover

When you failover to the secondary region, users need to reach the new region. Azure Traffic Manager handles this with DNS-based failover; Azure Front Door can handle failover at the edge by routing to a healthy origin:

```bash
# Create a Traffic Manager profile for DNS-based failover
az network traffic-manager profile create \
  --resource-group global-rg \
  --name myapp-traffic-manager \
  --routing-method Priority \
  --unique-dns-name myapp \
  --monitor-protocol HTTPS \
  --monitor-path /health/ready \
  --monitor-port 443 \
  --ttl 30

# Add the primary endpoint (priority 1 = preferred)
az network traffic-manager endpoint create \
  --resource-group global-rg \
  --profile-name myapp-traffic-manager \
  --name eastus-primary \
  --type externalEndpoints \
  --target myapp-eastus.azurewebsites.net \
  --priority 1

# Add the secondary endpoint (priority 2 = failover target)
az network traffic-manager endpoint create \
  --resource-group global-rg \
  --profile-name myapp-traffic-manager \
  --name westus-secondary \
  --type externalEndpoints \
  --target myapp-westus.azurewebsites.net \
  --priority 2
```

Traffic Manager continuously probes both endpoints. When the primary fails health checks, it automatically directs DNS queries to the secondary.

## Database DR Strategies

VMs are just one piece. Your data tier needs its own DR strategy:

### Azure SQL Database

```bash
# Create a failover group for Azure SQL
az sql failover-group create \
  --resource-group prod-rg \
  --server my-sql-server-eastus \
  --name my-failover-group \
  --partner-server my-sql-server-westus \
  --partner-resource-group dr-prod-rg \
  --add-db myappdb \
  --failover-policy Automatic \
  --grace-period 1
```

The failover group provides a listener endpoint that automatically redirects connections to whichever server is primary. Your application connects to `my-failover-group.database.windows.net` and the failover is transparent.

### Azure Cosmos DB

Cosmos DB handles failover natively with automatic failover configuration. The account must already have the regions you include in the failover policy:

```bash
# Enable automatic failover for Cosmos DB
az cosmosdb update \
  --resource-group prod-rg \
  --name my-cosmos-account \
  --enable-automatic-failover true

# The failover priority determines which region becomes primary
# East US (priority 0) is primary, West US (priority 1) is secondary
az cosmosdb failover-priority-change \
  --resource-group prod-rg \
  --name my-cosmos-account \
  --failover-policies "eastus=0" "westus=1"
```

## Testing Your DR Plan

A disaster recovery plan that has never been tested is just a hope. Azure Site Recovery supports test failovers that do not affect your production environment:

```powershell
# Run a test failover
# This creates the VMs in an isolated network so it does not affect production
$vault = Get-AzRecoveryServicesVault -ResourceGroupName "dr-rg" -Name "my-recovery-vault"
Set-AzRecoveryServicesAsrVaultContext -Vault $vault

$recoveryPlan = Get-AzRecoveryServicesAsrRecoveryPlan -Name "my-recovery-plan"
$testNetworkId = "/subscriptions/{sub}/resourceGroups/dr-prod-rg/providers/Microsoft.Network/virtualNetworks/dr-test-vnet"

Start-AzRecoveryServicesAsrTestFailoverJob `
  -RecoveryPlan $recoveryPlan `
  -Direction PrimaryToRecovery `
  -AzureVMNetworkId $testNetworkId
```

Schedule DR tests quarterly. Document the results, including how long the failover took, any issues encountered, and the actual RPO achieved.

## Automation with Azure Automation Runbooks

Automate post-failover tasks with Azure Automation runbooks that run as part of the recovery plan:

```powershell
# PowerShell runbook that updates DNS and verifies the failover
param(
    [Object]$RecoveryPlanContext
)

# Update application settings to point to DR resources
$webApp = Get-AzWebApp -ResourceGroupName "dr-prod-rg" -Name "myapp-westus"

$settings = @{
    "DatabaseConnectionString" = "Server=my-sql-server-westus.database.windows.net;..."
    "RedisConnectionString" = "myapp-cache-westus.redis.cache.windows.net:6380,..."
    "IsFailoverMode" = "true"
}

Set-AzWebApp -ResourceGroupName "dr-prod-rg" -Name "myapp-westus" -AppSettings $settings

# Verify the application is healthy
$healthCheck = Invoke-WebRequest -Uri "https://myapp-westus.azurewebsites.net/health/ready"
if ($healthCheck.StatusCode -ne 200) {
    throw "Application health check failed after failover"
}

Write-Output "Failover completed successfully. Application is healthy."
```

## Failback After Recovery

Once the primary region is back online, you need to failback. This involves reversing the replication direction and doing a planned failover back to the primary:

1. Ensure the primary region is healthy
2. Re-protect the VMs (reverse replication from secondary to primary)
3. Wait for initial replication to complete
4. Perform a planned failover back to primary
5. Update DNS to point back to primary
6. Re-protect again to resume normal DR replication

## Summary

An active-passive DR strategy with Azure Site Recovery provides reliable protection against regional outages at a fraction of the cost of active-active. The key components are continuous VM replication with ASR, database failover groups, a recovery plan that orchestrates the startup sequence, DNS failover with Traffic Manager, and automation scripts for post-failover tasks. Test your DR plan regularly - the worst time to discover it does not work is during an actual disaster.
