# How to Connect Kubernetes Clusters to Azure Arc and Manage Them from the Azure Portal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Arc, Kubernetes, K8s, Hybrid Cloud, Cluster Management, GitOps

Description: Step-by-step guide to connecting Kubernetes clusters running anywhere to Azure Arc so you can manage them from the Azure Portal with Azure services.

---

Kubernetes clusters have a tendency to proliferate. You might have clusters in AWS, on-premises in your data center, running on edge devices, or spread across multiple cloud providers. Each one has its own management interface, its own monitoring stack, and its own deployment workflow. Azure Arc for Kubernetes lets you bring all of these clusters under a single management plane in Azure.

In this post, I will cover how to connect Kubernetes clusters to Azure Arc, what happens during the connection process, and how to start managing your clusters from the Azure Portal once they are connected.

## What Connecting a Cluster Actually Does

When you connect a Kubernetes cluster to Azure Arc, a set of agents are deployed into the cluster in the `azure-arc` namespace. These agents maintain an outbound connection to Azure and handle the following:

- **Cluster metadata sync** - Sends cluster information (version, node count, etc.) to Azure
- **Configuration management** - Enables GitOps-based configuration through Flux
- **Extension management** - Allows you to install Azure extensions into the cluster
- **Policy enforcement** - Enables Azure Policy for Kubernetes
- **Monitoring** - Allows Azure Monitor integration

The agents only make outbound connections. No inbound ports need to be opened, which makes this work well even in restrictive network environments.

## Prerequisites

Before connecting a cluster, make sure you have:

**Cluster requirements:**
- Kubernetes 1.20 or later
- At least 2 CPU cores and 4 GB RAM available for the Arc agents
- kubectl configured to connect to the cluster
- Helm 3.6 or later installed on your workstation
- Cluster admin permissions

**Azure requirements:**
- Azure CLI 2.40 or later with the connectedk8s extension
- An Azure subscription with the Microsoft.Kubernetes and Microsoft.KubernetesConfiguration resource providers registered

**Network requirements:**
- Outbound connectivity from the cluster to Azure endpoints on port 443
- The specific endpoints are listed in the Microsoft docs, but the main ones are `management.azure.com`, `login.microsoftonline.com`, and regional Arc endpoints

Install the required Azure CLI extensions:

```bash
# Install or update the connectedk8s extension
az extension add --name connectedk8s --upgrade

# Install the k8s-configuration extension for GitOps
az extension add --name k8s-configuration --upgrade

# Register the required resource providers
az provider register --namespace Microsoft.Kubernetes
az provider register --namespace Microsoft.KubernetesConfiguration
az provider register --namespace Microsoft.ExtendedLocation
```

## Connecting Your First Cluster

Let me walk through the connection process for a cluster. This works the same whether your cluster is running on EKS, GKE, on-premises, k3s, or any other CNCF-conformant distribution.

### Step 1: Verify Cluster Access

Make sure your kubeconfig is pointing to the right cluster:

```bash
# Verify you are connected to the correct cluster
kubectl config current-context
kubectl get nodes
```

### Step 2: Connect the Cluster to Azure Arc

```bash
# Connect the cluster to Azure Arc
az connectedk8s connect \
    --name "my-onprem-cluster" \
    --resource-group "arc-k8s-rg" \
    --location "eastus" \
    --tags "Environment=Production" "Team=Platform"
```

This command does several things:
1. Creates a Helm release in the cluster that deploys the Arc agents
2. Registers the cluster as an Azure resource
3. Establishes a secure connection between the cluster and Azure

The process takes a few minutes. You can monitor the agent deployment:

```bash
# Watch the Arc agent pods come up
kubectl get pods -n azure-arc --watch

# Verify the connection status
az connectedk8s show \
    --name "my-onprem-cluster" \
    --resource-group "arc-k8s-rg" \
    --output table
```

You should see pods like `flux-system`, `cluster-metadata-operator`, `config-agent`, and others running in the `azure-arc` namespace.

## Connecting Clusters at Scale

For organizations with many clusters, you can automate the connection process.

### Scripted Bulk Connection

```bash
#!/bin/bash
# Connect multiple clusters to Azure Arc
# Assumes kubeconfig contexts are named after clusters

RESOURCE_GROUP="arc-k8s-rg"
LOCATION="eastus"

# Array of cluster context names
CLUSTERS=(
    "prod-cluster-east"
    "prod-cluster-west"
    "staging-cluster"
    "dev-cluster"
    "edge-cluster-store-1"
    "edge-cluster-store-2"
)

for CLUSTER in "${CLUSTERS[@]}"; do
    echo "Connecting $CLUSTER to Azure Arc..."

    # Switch kubectl context
    kubectl config use-context "$CLUSTER"

    # Connect to Arc
    az connectedk8s connect \
        --name "$CLUSTER" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --tags "ConnectedDate=$(date +%Y-%m-%d)" \
        --kube-context "$CLUSTER"

    echo "Finished connecting $CLUSTER"
    echo "---"
done
```

### Using a Service Principal for Automation

For CI/CD pipelines, use a service principal instead of interactive authentication:

```bash
# Create a service principal with the required permissions
az ad sp create-for-rbac \
    --name "arc-k8s-onboarding" \
    --role "Kubernetes Cluster - Azure Arc Onboarding" \
    --scopes "/subscriptions/your-sub-id/resourceGroups/arc-k8s-rg"

# In your automation script, authenticate with the SP
az login --service-principal \
    --username "sp-app-id" \
    --password "sp-secret" \
    --tenant "your-tenant-id"

# Then connect the cluster
az connectedk8s connect \
    --name "automated-cluster" \
    --resource-group "arc-k8s-rg" \
    --location "eastus"
```

## Managing Clusters from the Azure Portal

Once your clusters are connected, navigate to Azure Arc in the portal and click "Kubernetes clusters." You will see all your connected clusters listed alongside any AKS clusters.

### Cluster Overview

Click on a cluster to see its overview page. This shows:
- Cluster version and distribution
- Node count
- Agent status and connectivity
- Installed extensions
- Applied configurations

### Namespaces and Workloads

The portal provides a Kubernetes resource view where you can browse namespaces, deployments, pods, and services running in the cluster. This is particularly useful for clusters that do not have their own dashboard.

```
Cluster > Kubernetes resources > Namespaces
Cluster > Kubernetes resources > Workloads
Cluster > Kubernetes resources > Services and ingresses
```

To access Kubernetes resources through the portal, you need to set up a cluster connect token or Azure AD authentication:

```bash
# Enable the cluster-connect feature
az connectedk8s enable-features \
    --name "my-onprem-cluster" \
    --resource-group "arc-k8s-rg" \
    --features cluster-connect
```

### Setting Up GitOps Configuration

GitOps is one of the most powerful features of Arc-enabled Kubernetes. You define your desired cluster state in a Git repository, and Flux (the GitOps operator) continuously reconciles the cluster to match that state.

```bash
# Create a GitOps configuration using Flux v2
az k8s-configuration flux create \
    --name "cluster-config" \
    --cluster-name "my-onprem-cluster" \
    --resource-group "arc-k8s-rg" \
    --cluster-type "connectedClusters" \
    --namespace "cluster-config" \
    --scope "cluster" \
    --url "https://github.com/your-org/k8s-config.git" \
    --branch "main" \
    --kustomization name=infra path=./infrastructure prune=true \
    --kustomization name=apps path=./applications prune=true dependsOn=["infra"]
```

This creates two kustomizations: one for infrastructure components (deployed first) and one for applications (deployed after infrastructure). Changes pushed to the Git repository are automatically applied to the cluster.

## Deploying Extensions to Arc Kubernetes Clusters

Extensions add Azure capabilities to your Arc-connected clusters:

```bash
# Deploy Azure Monitor extension for container insights
az k8s-extension create \
    --name "azuremonitor-containers" \
    --cluster-name "my-onprem-cluster" \
    --resource-group "arc-k8s-rg" \
    --cluster-type "connectedClusters" \
    --extension-type "Microsoft.AzureMonitor.Containers" \
    --configuration-settings \
        logAnalyticsWorkspaceResourceID="/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.OperationalInsights/workspaces/workspace-name"

# Deploy Azure Policy extension
az k8s-extension create \
    --name "azure-policy" \
    --cluster-name "my-onprem-cluster" \
    --resource-group "arc-k8s-rg" \
    --cluster-type "connectedClusters" \
    --extension-type "Microsoft.PolicyInsights"
```

## Applying Azure Policy to Arc Kubernetes Clusters

Once the Azure Policy extension is installed, you can apply Kubernetes-specific policies:

```bash
# Assign a policy to prevent privileged containers
az policy assignment create \
    --name "no-privileged-containers" \
    --display-name "Do not allow privileged containers" \
    --policy "95edb821-ddaf-4404-9732-666045e056b4" \
    --scope "/subscriptions/sub-id/resourceGroups/arc-k8s-rg/providers/Microsoft.Kubernetes/connectedClusters/my-onprem-cluster"
```

## Troubleshooting Connection Issues

**Agents not coming up.** Check resource availability in the cluster. The Arc agents need at least 2 CPUs and 4 GB RAM. Also check if there are any pod security policies or admission controllers blocking the deployment.

**Connectivity issues.** Run the connectivity check:

```bash
# Check connectivity from within the cluster
az connectedk8s troubleshoot \
    --name "my-onprem-cluster" \
    --resource-group "arc-k8s-rg"
```

**Agent version mismatch.** Upgrade the agents:

```bash
# Upgrade Arc agents to the latest version
az connectedk8s upgrade \
    --name "my-onprem-cluster" \
    --resource-group "arc-k8s-rg"
```

## Summary

Connecting Kubernetes clusters to Azure Arc gives you a unified management plane for all your clusters, regardless of where they run. The connection process is straightforward, and once connected, you get access to GitOps configuration, Azure Policy enforcement, extension management, and portal-based cluster visibility. For organizations running Kubernetes across multiple environments, Arc is the glue that holds the management experience together.
