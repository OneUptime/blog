# How to Build Azure AKS Clusters with Bicep Templates and Managed Identity Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AKS, Bicep

Description: Learn how to deploy Azure Kubernetes Service clusters using Bicep templates with managed identities for secure authentication, eliminating the need for service principals and simplifying cluster operations.

---

Azure Kubernetes Service requires authentication to access Azure resources. Traditional approaches use service principals with secrets that need rotation and secure storage. Managed identities eliminate this complexity by providing automatic credential management through Azure Active Directory.

Bicep templates make AKS deployment declarative and repeatable. Combined with managed identities, you get secure, maintainable infrastructure code that follows Azure best practices.

## Understanding Managed Identities for AKS

Managed identities come in two types: system-assigned and user-assigned. System-assigned identities are tied to the cluster lifecycle and deleted when the cluster is destroyed. User-assigned identities exist independently and can be shared across resources.

For production AKS clusters, user-assigned identities provide more control. You create the identity first, assign necessary permissions, then reference it in the cluster configuration.

## Creating Your First Bicep Template

Start with a basic AKS cluster using system-assigned identity:

```bicep
// aks-basic.bicep
@description('The name of the AKS cluster')
param clusterName string = 'myaks'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Kubernetes version')
param kubernetesVersion string = '1.28.3'

@description('VM size for nodes')
param nodeVmSize string = 'Standard_D2s_v3'

@description('Number of nodes')
param nodeCount int = 3

resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-10-01' = {
  name: clusterName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    kubernetesVersion: kubernetesVersion
    dnsPrefix: '${clusterName}-dns'

    agentPoolProfiles: [
      {
        name: 'systempool'
        count: nodeCount
        vmSize: nodeVmSize
        osType: 'Linux'
        mode: 'System'
        enableAutoScaling: true
        minCount: 1
        maxCount: 5
        type: 'VirtualMachineScaleSets'
        vnetSubnetID: null
      }
    ]

    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'calico'
      serviceCidr: '10.200.0.0/16'
      dnsServiceIP: '10.200.0.10'
      loadBalancerSku: 'standard'
    }

    addonProfiles: {
      azurepolicy: {
        enabled: true
      }
      omsagent: {
        enabled: false
      }
    }
  }
}

output clusterName string = aksCluster.name
output controlPlaneFQDN string = aksCluster.properties.fqdn
output identityPrincipalId string = aksCluster.identity.principalId
```

Deploy the template:

```bash
# Create resource group
az group create --name myaks-rg --location eastus

# Deploy Bicep template
az deployment group create \
  --resource-group myaks-rg \
  --template-file aks-basic.bicep \
  --parameters clusterName=myaks nodeCount=3
```

## Implementing User-Assigned Managed Identity

For production clusters, use user-assigned identities:

```bicep
// aks-with-user-identity.bicep
@description('Cluster name')
param clusterName string

@description('Location')
param location string = resourceGroup().location

@description('Name for managed identity')
param identityName string = '${clusterName}-identity'

// Create user-assigned managed identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
}

// Create Log Analytics workspace for monitoring
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${clusterName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Create AKS cluster with user-assigned identity
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-10-01' = {
  name: clusterName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    kubernetesVersion: '1.28.3'
    dnsPrefix: '${clusterName}-dns'

    // Enable managed identity for kubelet
    identityProfile: {
      kubeletidentity: {
        resourceId: managedIdentity.id
        clientId: managedIdentity.properties.clientId
        objectId: managedIdentity.properties.principalId
      }
    }

    agentPoolProfiles: [
      {
        name: 'systempool'
        count: 3
        vmSize: 'Standard_D2s_v3'
        osType: 'Linux'
        mode: 'System'
        enableAutoScaling: true
        minCount: 1
        maxCount: 10
        maxPods: 110
        type: 'VirtualMachineScaleSets'
        availabilityZones: [
          '1'
          '2'
          '3'
        ]
      }
    ]

    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'calico'
      serviceCidr: '10.200.0.0/16'
      dnsServiceIP: '10.200.0.10'
      loadBalancerSku: 'standard'
      outboundType: 'loadBalancer'
    }

    addonProfiles: {
      azurepolicy: {
        enabled: true
        config: {
          version: 'v2'
        }
      }
      omsagent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalytics.id
        }
      }
      azureKeyvaultSecretsProvider: {
        enabled: true
        config: {
          enableSecretRotation: 'true'
          rotationPollInterval: '2m'
        }
      }
    }

    autoScalerProfile: {
      'scale-down-delay-after-add': '10m'
      'scale-down-unneeded-time': '10m'
      'scale-down-utilization-threshold': '0.5'
    }

    oidcIssuerProfile: {
      enabled: true
    }

    securityProfile: {
      workloadIdentity: {
        enabled: true
      }
      defender: {
        logAnalyticsWorkspaceResourceId: logAnalytics.id
        securityMonitoring: {
          enabled: true
        }
      }
    }
  }
}

// Grant managed identity permissions to AKS subnet
// This allows AKS to manage network resources
resource networkContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentity.id, 'NetworkContributor')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4d97b98b-1d4f-4787-a291-c67834d212e7')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output clusterName string = aksCluster.name
output identityId string = managedIdentity.id
output identityClientId string = managedIdentity.properties.clientId
output oidcIssuerUrl string = aksCluster.properties.oidcIssuerProfile.issuerURL
```

Deploy with parameters:

```bash
az deployment group create \
  --resource-group myaks-rg \
  --template-file aks-with-user-identity.bicep \
  --parameters clusterName=production-aks
```

## Integrating with Azure Container Registry

Enable AKS to pull images from ACR using managed identity:

```bicep
// aks-with-acr.bicep
param clusterName string
param acrName string
param location string = resourceGroup().location

// Create ACR
resource acr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

// Create managed identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${clusterName}-identity'
  location: location
}

// Grant AcrPull role to managed identity
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, managedIdentity.id, 'AcrPull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Create AKS cluster
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-10-01' = {
  name: clusterName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    kubernetesVersion: '1.28.3'
    dnsPrefix: '${clusterName}-dns'

    identityProfile: {
      kubeletidentity: {
        resourceId: managedIdentity.id
        clientId: managedIdentity.properties.clientId
        objectId: managedIdentity.properties.principalId
      }
    }

    agentPoolProfiles: [
      {
        name: 'systempool'
        count: 3
        vmSize: 'Standard_D2s_v3'
        mode: 'System'
      }
    ]

    networkProfile: {
      networkPlugin: 'azure'
      serviceCidr: '10.200.0.0/16'
      dnsServiceIP: '10.200.0.10'
    }
  }
  dependsOn: [
    acrPullRole
  ]
}

output acrLoginServer string = acr.properties.loginServer
output clusterName string = aksCluster.name
```

After deployment, push and pull images without credentials:

```bash
# Get AKS credentials
az aks get-credentials --resource-group myaks-rg --name production-aks

# Test pulling image (uses managed identity automatically)
kubectl run test --image=${ACR_NAME}.azurecr.io/myapp:latest
```

## Implementing Workload Identity

Enable workload identity for pods to access Azure resources:

```bicep
// aks-workload-identity.bicep
param clusterName string
param location string = resourceGroup().location
param appIdentityName string = 'app-identity'
param storageAccountName string

// Create AKS managed identity
resource aksIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${clusterName}-identity'
  location: location
}

// Create workload identity for application
resource appIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: appIdentityName
  location: location
}

// Create storage account
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
  }
}

// Grant app identity access to storage
resource storageBlobDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, appIdentity.id, 'StorageBlobDataContributor')
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: appIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Create AKS cluster with workload identity enabled
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-10-01' = {
  name: clusterName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${aksIdentity.id}': {}
    }
  }
  properties: {
    kubernetesVersion: '1.28.3'
    dnsPrefix: '${clusterName}-dns'

    identityProfile: {
      kubeletidentity: {
        resourceId: aksIdentity.id
        clientId: aksIdentity.properties.clientId
        objectId: aksIdentity.properties.principalId
      }
    }

    agentPoolProfiles: [
      {
        name: 'systempool'
        count: 3
        vmSize: 'Standard_D2s_v3'
        mode: 'System'
      }
    ]

    networkProfile: {
      networkPlugin: 'azure'
      serviceCidr: '10.200.0.0/16'
      dnsServiceIP: '10.200.0.10'
    }

    oidcIssuerProfile: {
      enabled: true
    }

    securityProfile: {
      workloadIdentity: {
        enabled: true
      }
    }
  }
}

// Create federated credential for workload identity
resource federatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  name: 'kubernetes-federated-credential'
  parent: appIdentity
  properties: {
    audiences: [
      'api://AzureADTokenExchange'
    ]
    issuer: aksCluster.properties.oidcIssuerProfile.issuerURL
    subject: 'system:serviceaccount:default:workload-identity-sa'
  }
}

output clusterName string = aksCluster.name
output oidcIssuerUrl string = aksCluster.properties.oidcIssuerProfile.issuerURL
output appIdentityClientId string = appIdentity.properties.clientId
output storageAccountName string = storage.name
```

Create Kubernetes service account with workload identity:

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: workload-identity-sa
  namespace: default
  annotations:
    azure.workload.identity/client-id: "${APP_IDENTITY_CLIENT_ID}"
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-identity
  namespace: default
  labels:
    azure.workload.identity/use: "true"
spec:
  serviceAccountName: workload-identity-sa
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: AZURE_STORAGE_ACCOUNT
      value: "${STORAGE_ACCOUNT_NAME}"
```

The pod automatically gets credentials to access Azure Storage using the managed identity.

## Building Complete Infrastructure with Modules

Organize complex deployments using Bicep modules:

```bicep
// main.bicep
param clusterName string
param location string = resourceGroup().location
param environment string

// Network module
module network 'modules/network.bicep' = {
  name: 'networkDeployment'
  params: {
    vnetName: '${clusterName}-vnet'
    location: location
    addressPrefix: '10.0.0.0/16'
  }
}

// Identity module
module identity 'modules/identity.bicep' = {
  name: 'identityDeployment'
  params: {
    identityName: '${clusterName}-identity'
    location: location
  }
}

// AKS module
module aks 'modules/aks.bicep' = {
  name: 'aksDeployment'
  params: {
    clusterName: clusterName
    location: location
    subnetId: network.outputs.aksSubnetId
    managedIdentityId: identity.outputs.identityId
    environment: environment
  }
}

output clusterName string = aks.outputs.clusterName
output identityClientId string = identity.outputs.clientId
```

Network module:

```bicep
// modules/network.bicep
param vnetName string
param location string
param addressPrefix string

resource vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        addressPrefix
      ]
    }
    subnets: [
      {
        name: 'aks-subnet'
        properties: {
          addressPrefix: cidrSubnet(addressPrefix, 20, 0)
        }
      }
      {
        name: 'appgw-subnet'
        properties: {
          addressPrefix: cidrSubnet(addressPrefix, 24, 1)
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output aksSubnetId string = vnet.properties.subnets[0].id
output appGwSubnetId string = vnet.properties.subnets[1].id
```

## Summary

Bicep templates combined with managed identities provide secure, maintainable AKS infrastructure. System-assigned identities work for simple scenarios, while user-assigned identities give you control for production clusters. Workload identity extends this security model to applications running in Kubernetes, eliminating the need to store credentials. Bicep's modular structure lets you build reusable components that follow Azure best practices and scale from single clusters to multi-region deployments.
