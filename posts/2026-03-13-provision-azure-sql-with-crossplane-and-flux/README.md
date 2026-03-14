# How to Provision Azure SQL with Crossplane and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, Azure, SQL, GitOps, Kubernetes, Database, Infrastructure as Code

Description: Provision Azure SQL databases using Crossplane managed resources reconciled by Flux CD for GitOps-driven database lifecycle management on Azure.

---

## Introduction

Azure SQL Database is Microsoft's fully managed relational database service built on SQL Server. Provisioning it through Crossplane and Flux transforms the process from console clicks or imperative scripts into a declarative Git workflow. The database, its server, firewall rules, and configuration all become YAML manifests that are reviewed and reconciled continuously.

Azure SQL provisioning with Crossplane requires an Azure SQL Server resource as the parent, followed by one or more database resources. Both are defined as Kubernetes objects and reconciled by the `provider-azure-sql` sub-provider. This guide covers the full setup including the resource group, SQL server, and database.

## Prerequisites

- Crossplane with `provider-azure-sql` and `provider-azure-resource` installed
- The Azure ProviderConfig named `default` configured
- Flux CD bootstrapped on the cluster
- An Azure subscription with an existing virtual network

## Step 1: Create the Resource Group

```yaml
# infrastructure/databases/azure/resource-group.yaml
apiVersion: azure.upbound.io/v1beta1
kind: ResourceGroup
metadata:
  name: production-databases-rg
spec:
  forProvider:
    # Azure region for all resources in this group
    location: East US
    tags:
      Environment: production
      ManagedBy: crossplane
  providerConfigRef:
    name: default
```

## Step 2: Create the Azure SQL Server

The SQL Server is the logical container for one or more databases.

```yaml
# infrastructure/databases/azure/sql-server.yaml
apiVersion: sql.azure.upbound.io/v1beta1
kind: Server
metadata:
  name: production-sql-server
spec:
  forProvider:
    location: East US
    resourceGroupNameRef:
      name: production-databases-rg
    # SQL Server version
    version: "12.0"
    # Administrator credentials
    administratorLogin: sqladmin
    administratorLoginPasswordSecretRef:
      namespace: crossplane-system
      name: azure-sql-admin-password
      key: password
    # Minimum TLS version for security compliance
    minimumTlsVersion: "1.2"
    # Enable Azure AD authentication in addition to SQL auth
    azureadAdministrator:
      - loginUsername: platform-team@example.com
        objectId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        tenantId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    tags:
      Environment: production
      ManagedBy: crossplane
  providerConfigRef:
    name: default
```

## Step 3: Configure Firewall Rules

```yaml
# infrastructure/databases/azure/firewall-rules.yaml
apiVersion: sql.azure.upbound.io/v1beta1
kind: FirewallRule
metadata:
  name: allow-azure-services
spec:
  forProvider:
    # Setting both start and end to 0.0.0.0 allows Azure services
    startIpAddress: "0.0.0.0"
    endIpAddress: "0.0.0.0"
    serverNameRef:
      name: production-sql-server
    resourceGroupNameRef:
      name: production-databases-rg
  providerConfigRef:
    name: default

---
# Allow specific VNet subnets using Virtual Network Rules
apiVersion: sql.azure.upbound.io/v1beta1
kind: VirtualNetworkRule
metadata:
  name: allow-app-subnet
spec:
  forProvider:
    serverNameRef:
      name: production-sql-server
    resourceGroupNameRef:
      name: production-databases-rg
    # Reference the subnet ID where your application pods run
    subnetId: /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/network-rg/providers/Microsoft.Network/virtualNetworks/main-vnet/subnets/app-subnet
    ignoreMissingVnetServiceEndpoint: false
  providerConfigRef:
    name: default
```

## Step 4: Create the Azure SQL Database

```yaml
# infrastructure/databases/azure/sql-database.yaml
apiVersion: sql.azure.upbound.io/v1beta1
kind: Database
metadata:
  name: production-appdb
spec:
  forProvider:
    serverIdRef:
      name: production-sql-server
    # Service tier and compute configuration
    skuName: GP_Gen5_4  # General Purpose, Gen5, 4 vCores
    # Storage size in GB
    maxSizeGb: 250
    # Zone redundancy for high availability within a region
    zoneRedundant: true
    # Geo-redundant backup for disaster recovery
    geoBackupEnabled: true
    # Collation for the database
    collation: SQL_Latin1_General_CP1_CI_AS
    # Short-term retention for point-in-time restore (1-35 days)
    shortTermRetentionPolicy:
      - retentionDays: 14
    # Long-term backup retention policy
    longTermRetentionPolicy:
      - weeklyRetention: P1M    # Keep weekly backups for 1 month
        monthlyRetention: P6M   # Keep monthly backups for 6 months
        yearlyRetention: P5Y    # Keep yearly backups for 5 years
        weekOfYear: 1
    tags:
      Environment: production
      ManagedBy: crossplane
  # Write connection details to a secret for applications
  writeConnectionSecretsToRef:
    namespace: crossplane-system
    name: production-azure-sql-connection
  providerConfigRef:
    name: default
```

## Step 5: Create the Admin Password Secret

```bash
# Generate a strong password meeting Azure SQL requirements
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

kubectl create secret generic azure-sql-admin-password \
  --from-literal=password="${DB_PASSWORD}Aa1!" \
  --namespace crossplane-system
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/azure-databases.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: azure-databases
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/databases/azure
  # Never auto-prune databases - require explicit manifest deletion
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane-providers-azure
```

## Step 7: Verify Provisioning

```bash
# Watch resource creation (Azure SQL takes several minutes)
kubectl get servers.sql.azure.upbound.io --watch
kubectl get databases.sql.azure.upbound.io --watch

# Check for errors
kubectl describe database.sql.azure.upbound.io production-appdb

# Retrieve the connection string endpoint
kubectl get secret production-azure-sql-connection \
  -n crossplane-system -o yaml
```

## Best Practices

- Enable `zoneRedundant: true` and `geoBackupEnabled: true` for production Azure SQL databases to protect against zone and regional failures.
- Use Azure Active Directory authentication (`azureadAdministrator`) alongside SQL authentication and rotate SQL credentials regularly.
- Configure long-term retention policies (`longTermRetentionPolicy`) to meet compliance requirements for backup retention.
- Use Virtual Network Rules instead of IP-based firewall rules to restrict access to specific Azure VNet subnets.
- Set `prune: false` on the Flux Kustomization for databases to prevent accidental deletion.

## Conclusion

Azure SQL databases are now provisioned and managed through Crossplane and Flux CD. The database server, database, firewall rules, and retention policies are all defined in Git. Crossplane reconciles the actual Azure resources to match the desired state continuously, and any configuration drift is automatically corrected without manual intervention.
