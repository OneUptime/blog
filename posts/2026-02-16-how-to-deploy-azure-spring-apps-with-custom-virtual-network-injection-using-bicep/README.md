# How to Deploy Azure Spring Apps with Custom Virtual Network Injection Using Bicep

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Spring Apps, Bicep, Virtual Network, Java, Infrastructure as Code, Microservices

Description: Deploy Azure Spring Apps with custom VNet injection using Bicep to host Java microservices in a network-isolated environment with full connectivity control.

---

Azure Spring Apps (formerly Azure Spring Cloud) is a managed service for running Spring Boot and Spring Cloud applications. By default, it runs in a Microsoft-managed virtual network, which is fine for development but not ideal for production. VNet injection lets you deploy Azure Spring Apps into your own virtual network, giving you control over network security groups, route tables, DNS resolution, and connectivity to on-premises resources.

VNet injection is one of those features that is straightforward in concept but has a long list of specific networking requirements. Doing it through Bicep ensures you get all the details right every time. This post covers a complete Bicep deployment for Azure Spring Apps with VNet injection.

## Networking Requirements

Before writing any Bicep, you need to understand what Azure Spring Apps needs from the network:

1. **Two dedicated subnets** - One for the Spring Apps runtime and one for your applications. Both must be delegated to `Microsoft.AppPlatform/Spring`.
2. **Minimum subnet size** - Each subnet needs at least a /28 (16 addresses), but /24 is recommended for production.
3. **No existing resources** - The subnets must be empty before deployment.
4. **Network contributor permissions** - The Azure Spring Apps resource provider needs Network Contributor role on the VNet.
5. **DNS resolution** - You need a private DNS zone for the internal FQDN resolution.

## Parameters and Variables

```bicep
// Parameters for the deployment
param location string = resourceGroup().location
param environmentName string = 'prod'
param springAppsName string = 'spring-${environmentName}'
param vnetAddressPrefix string = '10.1.0.0/16'
param runtimeSubnetPrefix string = '10.1.0.0/24'
param appSubnetPrefix string = '10.1.1.0/24'
param sharedSubnetPrefix string = '10.1.2.0/24'

// Tags applied to all resources
var tags = {
  Environment: environmentName
  ManagedBy: 'bicep'
  Service: 'spring-apps'
}

// Azure Spring Apps Resource Provider Object ID
// This is a well-known ID that needs Network Contributor on your VNet
var springAppsResourceProviderObjectId = 'e8de9221-a19c-4c81-b814-fd37c6caf9d2'
```

## Virtual Network and Subnets

Create the VNet with the required subnets. The key detail is the subnet delegation, which tells Azure that these subnets are reserved for Spring Apps.

```bicep
// Virtual Network for Spring Apps
resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: 'vnet-${springAppsName}'
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        vnetAddressPrefix
      ]
    }
    subnets: [
      {
        // Runtime subnet - used by Azure Spring Apps internal components
        name: 'snet-spring-runtime'
        properties: {
          addressPrefix: runtimeSubnetPrefix
          // No NSG on the runtime subnet - Spring Apps manages its own security
        }
      }
      {
        // Application subnet - your Spring Boot apps run here
        name: 'snet-spring-apps'
        properties: {
          addressPrefix: appSubnetPrefix
        }
      }
      {
        // Shared services subnet - for resources that need to communicate with Spring Apps
        name: 'snet-shared'
        properties: {
          addressPrefix: sharedSubnetPrefix
        }
      }
    ]
  }
}

// References to the subnets for use in other resources
resource runtimeSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' existing = {
  parent: vnet
  name: 'snet-spring-runtime'
}

resource appSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' existing = {
  parent: vnet
  name: 'snet-spring-apps'
}
```

## Role Assignment for the Resource Provider

Azure Spring Apps resource provider needs Network Contributor permissions on the VNet to manage networking resources within the subnets.

```bicep
// Grant Azure Spring Apps resource provider Network Contributor on the VNet
resource springAppsNetworkContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: vnet
  name: guid(vnet.id, springAppsResourceProviderObjectId, 'Network Contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4d97b98b-1d4f-4787-a291-c67834d212e7')
    principalId: springAppsResourceProviderObjectId
    principalType: 'ServicePrincipal'
  }
}
```

## Azure Spring Apps Resource

With the network in place, deploy the Spring Apps instance.

```bicep
// Azure Spring Apps with VNet injection
resource springApps 'Microsoft.AppPlatform/Spring@2023-12-01' = {
  name: springAppsName
  location: location
  tags: tags
  sku: {
    name: 'S0'      // Standard tier - required for VNet injection
    tier: 'Standard'
  }
  properties: {
    // VNet injection configuration
    networkProfile: {
      // Subnet for Spring Apps runtime components
      serviceRuntimeSubnetId: runtimeSubnet.id
      // Subnet for your applications
      appSubnetId: appSubnet.id
      // CIDR ranges for internal service communication
      serviceCidr: '10.0.0.0/16,10.2.0.1/16,10.3.0.1/16'
      serviceRuntimeNetworkResourceGroup: 'rg-${springAppsName}-runtime'
      appNetworkResourceGroup: 'rg-${springAppsName}-apps'
    }
    // Zone redundancy for high availability
    zoneRedundant: true
  }
  dependsOn: [
    springAppsNetworkContributor   // Ensure network permissions are in place first
  ]
}
```

The `serviceCidr` property defines internal CIDR ranges used by Spring Apps for Kubernetes pods and services. These ranges must not overlap with the VNet address space or any peered networks.

## Deploying Spring Boot Applications

After the Spring Apps instance is created, define the applications and deployments.

```bicep
// Spring Boot application definition
resource apiApp 'Microsoft.AppPlatform/Spring/apps@2023-12-01' = {
  parent: springApps
  name: 'api-service'
  properties: {
    // Public endpoint for this app (accessible through the assigned FQDN)
    public: true
    httpsOnly: true
    temporaryDisk: {
      sizeInGB: 5
      mountPath: '/tmp'
    }
    persistentDisk: {
      sizeInGB: 10
      mountPath: '/data'
    }
  }
}

// Deployment configuration for the API service
resource apiDeployment 'Microsoft.AppPlatform/Spring/apps/deployments@2023-12-01' = {
  parent: apiApp
  name: 'default'
  sku: {
    name: 'S0'
    tier: 'Standard'
    capacity: 2    // Number of app instances (replicas)
  }
  properties: {
    deploymentSettings: {
      resourceRequests: {
        cpu: '2'          // 2 vCPU per instance
        memory: '4Gi'     // 4 GB memory per instance
      }
      environmentVariables: {
        SPRING_PROFILES_ACTIVE: environmentName
        SERVER_PORT: '8080'
        JAVA_OPTS: '-Xms2g -Xmx3g -XX:+UseG1GC'
      }
    }
    source: {
      type: 'Jar'
      relativePath: '<default>'    // Placeholder - actual JAR is deployed via CI/CD
    }
  }
}

// Config server configuration for Spring Cloud Config
resource configServer 'Microsoft.AppPlatform/Spring/configServers@2023-12-01' = {
  parent: springApps
  name: 'default'
  properties: {
    configServer: {
      gitProperty: {
        uri: 'https://github.com/your-org/spring-config.git'
        label: 'main'
        searchPaths: [
          environmentName
        ]
      }
    }
  }
}
```

## Private DNS Zone

For applications within your VNet to resolve the Spring Apps internal URLs, you need a private DNS zone.

```bicep
// Private DNS zone for Spring Apps internal resolution
resource privateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'private.azuremicroservices.io'
  location: 'global'
  tags: tags
}

// Link the DNS zone to the VNet
resource dnsVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: privateDnsZone
  name: 'spring-apps-dns-link'
  location: 'global'
  properties: {
    virtualNetwork: {
      id: vnet.id
    }
    registrationEnabled: false
  }
}

// A record pointing to the Spring Apps internal load balancer
resource dnsRecord 'Microsoft.Network/privateDnsZones/A@2020-06-01' = {
  parent: privateDnsZone
  name: '*'
  properties: {
    ttl: 300
    aRecords: [
      {
        // This IP will need to be updated after deployment with the actual internal IP
        ipv4Address: '10.1.0.7'
      }
    ]
  }
}
```

## Log Analytics and Diagnostics

Monitor your Spring Apps with diagnostic settings.

```bicep
// Log Analytics workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${springAppsName}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Diagnostic settings for Spring Apps
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: springApps
  name: 'spring-apps-diagnostics'
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        category: 'ApplicationConsole'
        enabled: true
      }
      {
        category: 'SystemLogs'
        enabled: true
      }
      {
        category: 'IngressLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
```

## Deployment

Deploy the entire setup with a single command.

```bash
# Create the resource group
az group create --name rg-spring-apps --location eastus2

# Deploy the Bicep template
az deployment group create \
  --resource-group rg-spring-apps \
  --template-file main.bicep \
  --parameters environmentName='prod'
```

The deployment takes 15-25 minutes because Azure Spring Apps provisions a full Kubernetes cluster behind the scenes within your VNet.

## Deploying Application Code

After the infrastructure is in place, deploy your Spring Boot JAR files.

```bash
# Deploy a JAR to the api-service app
az spring app deploy \
  --resource-group rg-spring-apps \
  --service spring-prod \
  --name api-service \
  --artifact-path target/api-service-1.0.0.jar \
  --jvm-options "-Xms2g -Xmx3g"
```

## Wrapping Up

VNet injection for Azure Spring Apps gives you the network isolation and control that production microservices need. The Bicep template in this post handles the non-obvious requirements - dedicated subnets, resource provider permissions, DNS zones, and proper CIDR planning. Once deployed, your Spring Boot applications run in a fully managed environment within your own network, with connectivity to on-premises resources through VPN or ExpressRoute and to other Azure services through private endpoints.
