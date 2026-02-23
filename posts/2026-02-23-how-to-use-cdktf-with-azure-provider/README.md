# How to Use CDKTF with Azure Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Azure, Infrastructure as Code, Cloud

Description: A hands-on guide to using CDKTF with the Azure provider to provision and manage Azure cloud infrastructure using TypeScript with full type safety.

---

Azure is one of the major cloud platforms, and the Terraform AzureRM provider gives you access to nearly every Azure service through infrastructure as code. When you combine this with CDKTF, you get typed bindings for all those services, which means fewer typos, better autocompletion, and faster development. This guide covers setting up CDKTF for Azure and building common infrastructure patterns.

## Setting Up CDKTF for Azure

Start by creating a new CDKTF project and installing the Azure provider:

```bash
# Create and initialize the project
mkdir cdktf-azure && cd cdktf-azure
cdktf init --template=typescript --local

# Install the pre-built Azure provider
npm install @cdktf/provider-azurerm
```

You need Azure credentials configured. The easiest way during development is the Azure CLI:

```bash
# Login to Azure
az login

# Set the subscription you want to use
az account set --subscription "your-subscription-id"

# Verify your login
az account show
```

For CI/CD environments, use a service principal:

```bash
# Create a service principal for automation
az ad sp create-for-rbac --name "cdktf-deployer" --role contributor \
  --scopes /subscriptions/your-subscription-id

# Set the returned values as environment variables
export ARM_CLIENT_ID="app-id"
export ARM_CLIENT_SECRET="password"
export ARM_SUBSCRIPTION_ID="subscription-id"
export ARM_TENANT_ID="tenant-id"
```

## Configuring the Azure Provider

The Azure provider requires a `features` block, even if it is empty:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";

class AzureStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // The features block is required for the AzureRM provider
    new AzurermProvider(this, "azurerm", {
      features: [{}],
      // Optionally specify subscription
      subscriptionId: process.env.ARM_SUBSCRIPTION_ID,
    });
  }
}

const app = new App();
new AzureStack(app, "azure-infra");
app.synth();
```

## Creating Resource Groups

Every Azure resource lives in a resource group. Start there:

```typescript
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";

// Create a resource group for the project
const rg = new ResourceGroup(this, "rg", {
  name: "production-resources",
  location: "East US",
  tags: {
    Environment: "production",
    ManagedBy: "cdktf",
  },
});
```

## Building a Virtual Network

Here is a complete virtual network setup with subnets and network security groups:

```typescript
import { VirtualNetwork } from "@cdktf/provider-azurerm/lib/virtual-network";
import { Subnet } from "@cdktf/provider-azurerm/lib/subnet";
import { NetworkSecurityGroup } from "@cdktf/provider-azurerm/lib/network-security-group";
import { SubnetNetworkSecurityGroupAssociation } from "@cdktf/provider-azurerm/lib/subnet-network-security-group-association";

// Create the virtual network
const vnet = new VirtualNetwork(this, "vnet", {
  name: "production-vnet",
  resourceGroupName: rg.name,
  location: rg.location,
  addressSpace: ["10.0.0.0/16"],
  tags: { Environment: "production" },
});

// Create a web tier subnet
const webSubnet = new Subnet(this, "web-subnet", {
  name: "web-tier",
  resourceGroupName: rg.name,
  virtualNetworkName: vnet.name,
  addressPrefixes: ["10.0.1.0/24"],
});

// Create an application tier subnet
const appSubnet = new Subnet(this, "app-subnet", {
  name: "app-tier",
  resourceGroupName: rg.name,
  virtualNetworkName: vnet.name,
  addressPrefixes: ["10.0.2.0/24"],
});

// Create a database tier subnet
const dbSubnet = new Subnet(this, "db-subnet", {
  name: "db-tier",
  resourceGroupName: rg.name,
  virtualNetworkName: vnet.name,
  addressPrefixes: ["10.0.3.0/24"],
  serviceEndpoints: ["Microsoft.Sql"],
});

// Create a network security group for the web tier
const webNsg = new NetworkSecurityGroup(this, "web-nsg", {
  name: "web-tier-nsg",
  resourceGroupName: rg.name,
  location: rg.location,
  securityRule: [
    {
      name: "allow-https",
      priority: 100,
      direction: "Inbound",
      access: "Allow",
      protocol: "Tcp",
      sourcePortRange: "*",
      destinationPortRange: "443",
      sourceAddressPrefix: "*",
      destinationAddressPrefix: "*",
    },
    {
      name: "allow-http",
      priority: 110,
      direction: "Inbound",
      access: "Allow",
      protocol: "Tcp",
      sourcePortRange: "*",
      destinationPortRange: "80",
      sourceAddressPrefix: "*",
      destinationAddressPrefix: "*",
    },
  ],
});

// Associate the NSG with the web subnet
new SubnetNetworkSecurityGroupAssociation(this, "web-nsg-assoc", {
  subnetId: webSubnet.id,
  networkSecurityGroupId: webNsg.id,
});
```

## Deploying Azure App Service

Azure App Service is a popular choice for hosting web applications:

```typescript
import { ServicePlan } from "@cdktf/provider-azurerm/lib/service-plan";
import { LinuxWebApp } from "@cdktf/provider-azurerm/lib/linux-web-app";

// Create an App Service Plan
const plan = new ServicePlan(this, "app-plan", {
  name: "production-app-plan",
  resourceGroupName: rg.name,
  location: rg.location,
  osType: "Linux",
  skuName: "P1v3",
});

// Create a Linux Web App
const webApp = new LinuxWebApp(this, "web-app", {
  name: "my-production-webapp",
  resourceGroupName: rg.name,
  location: rg.location,
  servicePlanId: plan.id,
  httpsOnly: true,
  siteConfig: {
    alwaysOn: true,
    applicationStack: {
      nodeVersion: "18-lts",
    },
    minimumTlsVersion: "1.2",
  },
  appSettings: {
    NODE_ENV: "production",
    WEBSITE_RUN_FROM_PACKAGE: "1",
  },
  identity: {
    type: "SystemAssigned",
  },
});

// Output the web app URL
new TerraformOutput(this, "webapp-url", {
  value: `https://${webApp.defaultHostname}`,
});
```

## Setting Up Azure SQL Database

```typescript
import { MssqlServer } from "@cdktf/provider-azurerm/lib/mssql-server";
import { MssqlDatabase } from "@cdktf/provider-azurerm/lib/mssql-database";

// Create the SQL Server
const sqlServer = new MssqlServer(this, "sql-server", {
  name: "prod-sql-server",
  resourceGroupName: rg.name,
  location: rg.location,
  version: "12.0",
  administratorLogin: "sqladmin",
  administratorLoginPassword: "ChangeThisPassword123!",
  minimumTlsVersion: "1.2",
  publicNetworkAccessEnabled: false,
  identity: {
    type: "SystemAssigned",
  },
});

// Create a database on the server
const database = new MssqlDatabase(this, "app-db", {
  name: "applicationdb",
  serverId: sqlServer.id,
  skuName: "S1",
  maxSizeGb: 50,
  zoneRedundant: false,
  shortTermRetentionPolicy: {
    retentionDays: 7,
  },
});
```

## Creating Azure Storage Accounts

```typescript
import { StorageAccount } from "@cdktf/provider-azurerm/lib/storage-account";
import { StorageContainer } from "@cdktf/provider-azurerm/lib/storage-container";

// Create a storage account
const storage = new StorageAccount(this, "storage", {
  name: "prodstorageaccount",
  resourceGroupName: rg.name,
  location: rg.location,
  accountTier: "Standard",
  accountReplicationType: "GRS",
  minTlsVersion: "TLS1_2",
  enableHttpsTrafficOnly: true,
  blobProperties: {
    versioningEnabled: true,
    deleteRetentionPolicy: {
      days: 30,
    },
  },
});

// Create a blob container
new StorageContainer(this, "data-container", {
  name: "application-data",
  storageAccountName: storage.name,
  containerAccessType: "private",
});
```

## Setting Up Azure Kubernetes Service

```typescript
import { KubernetesCluster } from "@cdktf/provider-azurerm/lib/kubernetes-cluster";

const aks = new KubernetesCluster(this, "aks", {
  name: "production-aks",
  resourceGroupName: rg.name,
  location: rg.location,
  dnsPrefix: "prod-aks",
  kubernetesVersion: "1.28",
  defaultNodePool: {
    name: "system",
    nodeCount: 3,
    vmSize: "Standard_D4s_v3",
    enableAutoScaling: true,
    minCount: 2,
    maxCount: 5,
    osDiskSizeGb: 100,
  },
  identity: {
    type: "SystemAssigned",
  },
  networkProfile: {
    networkPlugin: "azure",
    networkPolicy: "calico",
    loadBalancerSku: "standard",
  },
  tags: { Environment: "production" },
});

// Output the kube config
new TerraformOutput(this, "kube-config", {
  value: aks.kubeConfigRaw,
  sensitive: true,
});
```

## Using Managed Identities

Azure Managed Identities eliminate the need for credentials in your applications:

```typescript
import { UserAssignedIdentity } from "@cdktf/provider-azurerm/lib/user-assigned-identity";
import { RoleAssignment } from "@cdktf/provider-azurerm/lib/role-assignment";

// Create a user-assigned managed identity
const identity = new UserAssignedIdentity(this, "app-identity", {
  name: "webapp-identity",
  resourceGroupName: rg.name,
  location: rg.location,
});

// Assign a role to the identity
new RoleAssignment(this, "storage-role", {
  scope: storage.id,
  roleDefinitionName: "Storage Blob Data Contributor",
  principalId: identity.principalId,
});
```

## Deploying Your Azure Infrastructure

```bash
# Generate Terraform configuration from CDKTF
cdktf synth

# Preview what will change
cdktf diff

# Deploy the stack
cdktf deploy

# Check outputs after deployment
cdktf output
```

## Tips for Working with Azure and CDKTF

1. **Resource naming**: Azure has strict naming rules that vary by resource type. Some resources require globally unique names (like storage accounts), while others just need to be unique within a resource group.

2. **Location consistency**: Keep resources in the same region when possible. Cross-region traffic adds latency and cost.

3. **Use managed identities**: They are more secure than service principals and easier to manage.

4. **Enable diagnostic settings**: Send logs and metrics to Log Analytics or Storage for observability.

5. **Use the features block wisely**: The `features` block in the provider configuration controls behaviors like whether to purge resources on deletion. Review the defaults for production use.

The CDKTF Azure provider covers virtually every Azure service, and having type-safe bindings makes it much faster to write correct configurations. For more on CDKTF fundamentals, see our post on [CDKTF constructs](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-constructs-for-infrastructure/view).
