# How to Deploy Azure Kubernetes Service with Pulumi in TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pulumi, Azure, Kubernetes, AKS, TypeScript, Infrastructure as Code, Cloud Native

Description: Deploy a production-ready Azure Kubernetes Service cluster using Pulumi with TypeScript for type-safe infrastructure as code with real programming constructs.

---

Pulumi lets you write infrastructure code in real programming languages instead of domain-specific ones like HCL or Bicep. If your team already writes TypeScript every day, deploying Azure Kubernetes Service with Pulumi feels natural - you get type checking, IDE autocompletion, loops, conditionals, async/await, and the entire npm ecosystem. No new language to learn.

In this post, I will walk through deploying a production-grade AKS cluster with Pulumi in TypeScript, including networking, managed identities, monitoring, and node pools.

## Why Pulumi for AKS?

I have deployed AKS clusters with Terraform, Bicep, and Pulumi. Each has its strengths. Pulumi stands out when you need complex logic - conditional resources, dynamic configuration, or integration with external APIs during deployment. TypeScript's type system also catches entire categories of errors that would only surface at plan or apply time with other tools.

## Project Setup

Start by creating a new Pulumi project:

```bash
# Create a new Pulumi project for Azure with TypeScript
mkdir aks-cluster && cd aks-cluster
pulumi new azure-typescript

# Install additional packages we will need
npm install @pulumi/azuread @pulumi/kubernetes
```

Pulumi generates a scaffold with `index.ts` as the entry point. Let me build out a complete AKS deployment.

## Setting Up the Foundation

First, create the networking and supporting resources that AKS needs:

```typescript
// index.ts - Deploy AKS cluster with all supporting infrastructure

import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as azuread from "@pulumi/azuread";
import * as k8s from "@pulumi/kubernetes";

// Load configuration values from Pulumi config
const config = new pulumi.Config();
const environment = config.require("environment"); // dev, staging, production
const location = config.get("location") || "eastus2";
const nodeCount = config.getNumber("nodeCount") || 3;
const nodeVmSize = config.get("nodeVmSize") || "Standard_D4s_v5";

// Naming convention - prefix all resources with environment
const prefix = `myapp-${environment}`;

// Create a resource group to hold everything
const resourceGroup = new azure.resources.ResourceGroup(`rg-${prefix}`, {
    resourceGroupName: `rg-${prefix}`,
    location: location,
    tags: {
        Environment: environment,
        ManagedBy: "Pulumi",
    },
});

// Create a virtual network for AKS
const vnet = new azure.network.VirtualNetwork(`vnet-${prefix}`, {
    virtualNetworkName: `vnet-${prefix}`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"],
    },
});

// Subnet for AKS nodes - needs to be large enough for pods
const aksSubnet = new azure.network.Subnet(`snet-aks-${prefix}`, {
    subnetName: "snet-aks",
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    addressPrefix: "10.0.0.0/20", // /20 gives 4096 addresses for nodes and pods
});

// Subnet for internal load balancers
const lbSubnet = new azure.network.Subnet(`snet-lb-${prefix}`, {
    subnetName: "snet-loadbalancers",
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    addressPrefix: "10.0.16.0/24",
});
```

## Creating the AKS Cluster

Now the main event - the AKS cluster with a managed identity, Azure CNI networking, and a system node pool:

```typescript
// Create a user-assigned managed identity for AKS
const aksIdentity = new azure.managedidentity.UserAssignedIdentity(`id-aks-${prefix}`, {
    resourceName: `id-aks-${prefix}`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
});

// Grant the managed identity Network Contributor on the VNet subnet
// This allows AKS to manage networking resources
const subnetRoleAssignment = new azure.authorization.RoleAssignment(`ra-aks-subnet`, {
    principalId: aksIdentity.principalId,
    principalType: "ServicePrincipal",
    roleDefinitionId: "/providers/Microsoft.Authorization/roleDefinitions/4d97b98b-1d4f-4787-a291-c67834d212e7", // Network Contributor
    scope: aksSubnet.id,
});

// Create a Log Analytics workspace for monitoring
const logAnalytics = new azure.operationalinsights.Workspace(`law-${prefix}`, {
    workspaceName: `law-${prefix}`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: "PerGB2018",
    },
    retentionInDays: 30,
});

// Deploy the AKS cluster
const aksCluster = new azure.containerservice.ManagedCluster(`aks-${prefix}`, {
    resourceName: `aks-${prefix}`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    dnsPrefix: `aks-${prefix}`,

    // Use the user-assigned managed identity
    identity: {
        type: "UserAssigned",
        userAssignedIdentities: [aksIdentity.id],
    },

    // Kubernetes version - check available versions with az aks get-versions
    kubernetesVersion: "1.29",

    // System node pool - runs kube-system pods
    agentPoolProfiles: [{
        name: "system",
        mode: "System",
        count: nodeCount,
        vmSize: nodeVmSize,
        osType: "Linux",
        osDiskSizeGB: 128,
        osDiskType: "Managed",
        vnetSubnetID: aksSubnet.id,
        availabilityZones: ["1", "2", "3"], // Spread across zones
        enableAutoScaling: true,
        minCount: 2,
        maxCount: 5,
        // Taint system nodes so only system pods run here
        nodeTaints: ["CriticalAddonsOnly=true:NoSchedule"],
    }],

    // Azure CNI networking
    networkProfile: {
        networkPlugin: "azure",
        networkPolicy: "calico",  // Enable network policies
        serviceCidr: "172.16.0.0/16",
        dnsServiceIP: "172.16.0.10",
        loadBalancerSku: "standard",
    },

    // Enable monitoring with Container Insights
    addonProfiles: {
        omsagent: {
            enabled: true,
            config: {
                logAnalyticsWorkspaceResourceID: logAnalytics.id,
            },
        },
        azureKeyvaultSecretsProvider: {
            enabled: true,  // Enable CSI driver for Key Vault
        },
    },

    // Enable Azure AD integration for RBAC
    aadProfile: {
        managed: true,
        enableAzureRBAC: true, // Use Azure RBAC for Kubernetes authorization
    },

    // Security settings
    enableRBAC: true,
    apiServerAccessProfile: {
        enablePrivateCluster: environment === "production", // Private cluster only in production
    },

    // Auto-upgrade to stable patch versions
    autoUpgradeProfile: {
        upgradeChannel: "stable",
    },

    tags: {
        Environment: environment,
        ManagedBy: "Pulumi",
    },
});
```

## Adding a User Node Pool

The system node pool runs Kubernetes system components. Application workloads should run on separate user node pools:

```typescript
// User node pool for application workloads
const appNodePool = new azure.containerservice.AgentPool(`np-app-${prefix}`, {
    agentPoolName: "app",
    resourceName: aksCluster.name,
    resourceGroupName: resourceGroup.name,
    mode: "User",
    vmSize: nodeVmSize,
    osDiskSizeGB: 256,
    osDiskType: "Ephemeral", // Ephemeral OS disk for better performance
    vnetSubnetID: aksSubnet.id,
    availabilityZones: ["1", "2", "3"],
    enableAutoScaling: true,
    count: nodeCount,
    minCount: 2,
    maxCount: 20,

    // Label nodes for pod scheduling
    nodeLabels: {
        "workload": "application",
        "environment": environment,
    },

    // Spot instances for dev/staging to save costs
    scaleSetPriority: environment === "production" ? "Regular" : "Spot",
    spotMaxPrice: environment === "production" ? undefined : -1, // -1 means current on-demand price
    scaleSetEvictionPolicy: environment === "production" ? undefined : "Delete",
});
```

Notice how TypeScript conditionals make it easy to have different behavior per environment. In production, we use regular VMs. In dev and staging, we use Spot instances to reduce costs. Try doing that cleanly in HCL - it is possible but much less readable.

## Configuring Kubernetes Resources

Pulumi can also manage Kubernetes resources within the cluster. Here is how to set up a namespace and configure the Kubernetes provider using the cluster credentials:

```typescript
// Get the kubeconfig from the AKS cluster
const creds = pulumi.all([resourceGroup.name, aksCluster.name]).apply(
    ([rgName, clusterName]) =>
        azure.containerservice.listManagedClusterUserCredentials({
            resourceGroupName: rgName,
            resourceName: clusterName,
        })
);

// Decode the kubeconfig from base64
const kubeconfig = creds.apply(c => {
    const encoded = c.kubeconfigs[0].value;
    return Buffer.from(encoded, "base64").toString("utf-8");
});

// Create a Kubernetes provider using the AKS credentials
const k8sProvider = new k8s.Provider("k8s-provider", {
    kubeconfig: kubeconfig,
});

// Create application namespaces
const namespaces = ["frontend", "backend", "monitoring"];
for (const ns of namespaces) {
    new k8s.core.v1.Namespace(ns, {
        metadata: {
            name: ns,
            labels: {
                environment: environment,
                "managed-by": "pulumi",
            },
        },
    }, { provider: k8sProvider });
}

// Install nginx ingress controller using Helm
const nginxIngress = new k8s.helm.v3.Release("nginx-ingress", {
    chart: "ingress-nginx",
    namespace: "ingress-nginx",
    createNamespace: true,
    repositoryOpts: {
        repo: "https://kubernetes.github.io/ingress-nginx",
    },
    values: {
        controller: {
            replicaCount: environment === "production" ? 3 : 1,
            service: {
                annotations: {
                    // Use Azure internal load balancer for private clusters
                    "service.beta.kubernetes.io/azure-load-balancer-internal":
                        environment === "production" ? "true" : "false",
                },
            },
            nodeSelector: {
                "workload": "application",
            },
        },
    },
}, { provider: k8sProvider });
```

## Exporting Outputs

Export the values that downstream consumers need:

```typescript
// Export cluster information for downstream use
export const clusterName = aksCluster.name;
export const resourceGroupName = resourceGroup.name;

// Export kubeconfig - marked as secret so Pulumi encrypts it
export const kubeconfigSecret = pulumi.secret(kubeconfig);

// Export the cluster's FQDN
export const clusterFqdn = aksCluster.fqdn;

// Export the ingress controller's public IP
export const ingressIp = nginxIngress.status.apply(s => {
    // Navigate the Helm release status to find the load balancer IP
    return "Check 'kubectl get svc -n ingress-nginx' for the external IP";
});
```

## Deploying the Cluster

Deploy with Pulumi's CLI:

```bash
# Preview changes before deploying
pulumi preview

# Deploy to the dev environment
pulumi config set environment dev
pulumi config set nodeCount 2
pulumi config set nodeVmSize Standard_B4ms
pulumi up

# Deploy to production with different settings
pulumi stack select production
pulumi config set environment production
pulumi config set nodeCount 3
pulumi config set nodeVmSize Standard_D4s_v5
pulumi up
```

Pulumi shows a detailed preview of every resource that will be created, updated, or deleted - similar to `terraform plan` but with richer output.

## Testing Your Infrastructure

One of Pulumi's underrated features is that you can write unit tests for your infrastructure in the same language:

```typescript
// index.test.ts - Unit tests for AKS infrastructure

import * as pulumi from "@pulumi/pulumi";
import "jest";

// Mock Pulumi runtime for testing
pulumi.runtime.setMocks({
    newResource: (args) => ({
        id: `${args.name}-id`,
        state: args.inputs,
    }),
    call: (args) => args.inputs,
});

describe("AKS Cluster", () => {
    let aksCluster: any;

    beforeAll(async () => {
        // Import the module under test
        aksCluster = await import("./index");
    });

    test("cluster name follows naming convention", (done) => {
        aksCluster.clusterName.apply((name: string) => {
            expect(name).toMatch(/^aks-myapp-/);
            done();
        });
    });

    test("resource group is in correct location", (done) => {
        aksCluster.resourceGroupName.apply((name: string) => {
            expect(name).toMatch(/^rg-myapp-/);
            done();
        });
    });
});
```

## Wrapping Up

Pulumi with TypeScript gives you a powerful way to deploy AKS clusters with the full expressiveness of a general-purpose language. The type system catches configuration errors early, conditionals let you handle environment differences cleanly, and the ability to manage both Azure resources and Kubernetes resources in the same program eliminates the gap between infrastructure provisioning and cluster configuration. If your team already knows TypeScript, the learning curve is minimal - you are essentially writing infrastructure the same way you write application code.
