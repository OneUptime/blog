# How to Implement Crossplane Provider for Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Azure

Description: Learn how to configure and use the Crossplane Azure provider to manage Azure resources from Kubernetes, including authentication, resource provisioning, and best practices.

---

The Crossplane Azure provider lets you manage Azure resources using Kubernetes manifests. Provision Azure SQL databases, storage accounts, virtual networks, and AKS clusters through kubectl instead of Azure CLI or ARM templates. The provider translates Kubernetes resources into Azure API calls, maintaining continuous reconciliation.

Azure's API surface is vast, and the Crossplane provider exposes it through hundreds of CRDs. Each Azure resource type gets a corresponding Kubernetes resource, bringing infrastructure management into your GitOps workflows.

## Installing the Azure Provider

Install the provider package:

```bash
# Install Azure provider
kubectl crossplane install provider \
  xpkg.upbound.io/crossplane-contrib/provider-azure:v0.35.0

# Check installation status
kubectl get providers

# Wait for provider to become healthy
kubectl wait --for=condition=Healthy \
  provider/provider-azure \
  --timeout=300s

# Verify CRDs
kubectl get crds | grep azure.crossplane.io
```

The provider installs controllers for Azure services and creates CRDs for resource types.

## Creating Azure Service Principal

Create a service principal for Crossplane authentication:

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac \
  --name crossplane-sp \
  --role Contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth > azure-credentials.json

# View credentials
cat azure-credentials.json
```

The output contains credentials needed for ProviderConfig.

## Creating Credentials Secret

Store Azure credentials as a Kubernetes secret:

```bash
# Create secret from credentials file
kubectl create secret generic azure-creds \
  -n crossplane-system \
  --from-file=creds=./azure-credentials.json

# Verify secret creation
kubectl describe secret azure-creds -n crossplane-system

# Secure the credentials file
chmod 600 azure-credentials.json
# Or delete it
rm azure-credentials.json
```

## Configuring the Azure Provider

Create ProviderConfig for authentication:

```yaml
apiVersion: azure.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: azure-creds
      key: creds
```

Apply the configuration:

```bash
kubectl apply -f azure-providerconfig.yaml

# Verify ProviderConfig
kubectl get providerconfigs
kubectl describe providerconfig default
```

## Provisioning a Resource Group

Create an Azure resource group:

```yaml
apiVersion: azure.crossplane.io/v1alpha3
kind: ResourceGroup
metadata:
  name: crossplane-rg
spec:
  location: eastus
  tags:
    Environment: Development
    ManagedBy: Crossplane
    Team: Platform
  providerConfigRef:
    name: default
```

Apply and monitor:

```bash
kubectl apply -f resource-group.yaml

# Watch resource creation
kubectl get resourcegroup crossplane-rg -w

# Check status
kubectl describe resourcegroup crossplane-rg

# Verify in Azure
az group show --name crossplane-rg
```

## Creating a Storage Account

Provision an Azure Storage Account:

```yaml
apiVersion: storage.azure.crossplane.io/v1alpha3
kind: Account
metadata:
  name: crossplanestorage001
spec:
  resourceGroupNameSelector:
    matchLabels:
      name: crossplane-rg
  storageAccountSpec:
    kind: StorageV2
    location: eastus
    sku:
      name: Standard_LRS
    properties:
      accessTier: Hot
      enableHttpsTrafficOnly: true
      encryption:
        services:
          blob:
            enabled: true
          file:
            enabled: true
        keySource: Microsoft.Storage
      networkAcls:
        defaultAction: Deny
        bypass: AzureServices
    tags:
      Environment: Production
      ManagedBy: Crossplane
  providerConfigRef:
    name: default
```

The `resourceGroupNameSelector` automatically links to the resource group created earlier.

## Provisioning Azure SQL Database

Create an Azure SQL Server and database:

```yaml
apiVersion: database.azure.crossplane.io/v1beta1
kind: SQLServer
metadata:
  name: crossplane-sql-server
spec:
  forProvider:
    resourceGroupNameSelector:
      matchLabels:
        name: crossplane-rg
    location: eastus
    version: "12.0"
    administratorLogin: sqladmin
    sslEnforcement: Enabled
    tags:
      Environment: Production
  writeConnectionSecretToRef:
    namespace: default
    name: sql-server-conn
  providerConfigRef:
    name: default
---
apiVersion: database.azure.crossplane.io/v1alpha3
kind: SQLServerFirewallRule
metadata:
  name: allow-azure-services
spec:
  serverNameSelector:
    matchLabels:
      name: crossplane-sql-server
  resourceGroupNameSelector:
    matchLabels:
      name: crossplane-rg
  properties:
    startIpAddress: "0.0.0.0"
    endIpAddress: "0.0.0.0"
  providerConfigRef:
    name: default
---
apiVersion: database.azure.crossplane.io/v1alpha3
kind: SQLDatabase
metadata:
  name: app-database
spec:
  forProvider:
    serverNameSelector:
      matchLabels:
        name: crossplane-sql-server
    resourceGroupNameSelector:
      matchLabels:
        name: crossplane-rg
    location: eastus
    sku:
      name: S0
      tier: Standard
    properties:
      collation: SQL_Latin1_General_CP1_CI_AS
  providerConfigRef:
    name: default
```

The connection secret contains endpoint, username, and password for the SQL server.

## Managing Virtual Networks

Create a virtual network with subnets:

```yaml
apiVersion: network.azure.crossplane.io/v1alpha3
kind: VirtualNetwork
metadata:
  name: crossplane-vnet
spec:
  resourceGroupNameSelector:
    matchLabels:
      name: crossplane-rg
  location: eastus
  properties:
    addressSpace:
      addressPrefixes:
      - 10.0.0.0/16
    enableDdosProtection: false
    enableVmProtection: false
  tags:
    Environment: Production
  providerConfigRef:
    name: default
---
apiVersion: network.azure.crossplane.io/v1alpha3
kind: Subnet
metadata:
  name: app-subnet
spec:
  virtualNetworkNameSelector:
    matchLabels:
      name: crossplane-vnet
  resourceGroupNameSelector:
    matchLabels:
      name: crossplane-rg
  properties:
    addressPrefix: 10.0.1.0/24
    serviceEndpoints:
    - service: Microsoft.Storage
    - service: Microsoft.Sql
  providerConfigRef:
    name: default
```

Service endpoints enable secure access to Azure services without public IPs.

## Provisioning Azure Kubernetes Service

Deploy an AKS cluster with Crossplane:

```yaml
apiVersion: compute.azure.crossplane.io/v1alpha3
kind: AKSCluster
metadata:
  name: crossplane-aks
spec:
  resourceGroupNameSelector:
    matchLabels:
      name: crossplane-rg
  location: eastus
  version: "1.27"
  nodeCount: 3
  nodeVMSize: Standard_D2s_v3
  dnsNamePrefix: crossplane-aks
  enableRBAC: true
  networkProfile:
    networkPlugin: azure
    serviceCidr: 10.240.0.0/16
    dnsServiceIP: 10.240.0.10
  identity:
    type: SystemAssigned
  tags:
    Environment: Production
    ManagedBy: Crossplane
  writeConnectionSecretToRef:
    namespace: default
    name: aks-kubeconfig
  providerConfigRef:
    name: default
```

Retrieve the kubeconfig:

```bash
kubectl get secret aks-kubeconfig -o jsonpath='{.data.kubeconfig}' | base64 -d > aks-kubeconfig.yaml

# Connect to AKS cluster
export KUBECONFIG=aks-kubeconfig.yaml
kubectl get nodes
```

## Using Managed Identity Authentication

Configure Crossplane to use Azure Managed Identity:

```yaml
apiVersion: azure.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: managed-identity
spec:
  credentials:
    source: InjectedIdentity
```

This requires configuring Azure AD Pod Identity or Workload Identity for the provider pods.

## Implementing Resource References

Link resources using selectors:

```yaml
apiVersion: cache.azure.crossplane.io/v1beta1
kind: Redis
metadata:
  name: app-redis
spec:
  forProvider:
    resourceGroupNameSelector:
      matchLabels:
        name: crossplane-rg
    location: eastus
    sku:
      name: Basic
      family: C
      capacity: 0
    enableNonSslPort: false
    minimumTlsVersion: "1.2"
    subnetIdSelector:
      matchLabels:
        name: cache-subnet
  writeConnectionSecretToRef:
    namespace: default
    name: redis-connection
  providerConfigRef:
    name: default
```

## Managing Multiple Azure Subscriptions

Configure different subscriptions:

```yaml
apiVersion: azure.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: production
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: azure-prod-creds
      key: creds
  subscriptionID: PROD_SUBSCRIPTION_ID
---
apiVersion: azure.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: development
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: azure-dev-creds
      key: creds
  subscriptionID: DEV_SUBSCRIPTION_ID
```

Reference the appropriate config in resources.

## Monitoring Azure Resources

Track resource status:

```bash
# List all Azure managed resources
kubectl get managed | grep azure

# Check specific resource type
kubectl get sqlserver

# Describe for detailed status
kubectl describe sqlserver crossplane-sql-server

# Check synchronization
kubectl get account -o jsonpath='{.items[*].status.conditions[?(@.type=="Synced")].status}'
```

## Troubleshooting Azure Provider

Common issues and solutions:

**Authentication failures**:
```bash
# Verify credentials
kubectl get secret azure-creds -n crossplane-system -o jsonpath='{.data.creds}' | base64 -d

# Check service principal
az ad sp show --id CLIENT_ID

# Test credentials
az login --service-principal -u CLIENT_ID -p CLIENT_SECRET --tenant TENANT_ID
```

**Resource creation stuck**:
```bash
# Check resource events
kubectl describe resourcegroup crossplane-rg

# View provider logs
kubectl logs -n crossplane-system -l pkg.crossplane.io/provider=provider-azure --tail=50
```

**Permission errors**:
```bash
# Verify service principal roles
az role assignment list --assignee CLIENT_ID

# Add required permissions
az role assignment create \
  --role Contributor \
  --assignee CLIENT_ID \
  --scope /subscriptions/SUBSCRIPTION_ID
```

## Conclusion

The Crossplane Azure provider enables managing Azure infrastructure through Kubernetes APIs. By configuring authentication with service principals or managed identity, using resource selectors for dependencies, and implementing proper RBAC controls, you create a robust platform for Azure resource management. The provider's comprehensive Azure API coverage allows provisioning and managing virtually any Azure service through familiar kubectl commands and GitOps workflows.
