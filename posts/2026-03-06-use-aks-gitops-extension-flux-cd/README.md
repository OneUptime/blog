# How to Use AKS GitOps Extension with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, azure, aks, gitops, kubernetes, azure-arc, extension

Description: A comprehensive guide to using the AKS GitOps extension for built-in Flux CD support, covering installation, configuration, and management through Azure CLI.

---

## Introduction

Azure Kubernetes Service (AKS) offers a built-in GitOps extension powered by Flux CD. Instead of manually installing and managing Flux components, you can use the `microsoft.flux` extension to deploy and manage Flux CD as a first-class AKS feature. This approach integrates with Azure Resource Manager, enabling you to manage GitOps configurations through the Azure CLI, Azure Portal, ARM templates, or Terraform.

The AKS GitOps extension provides automatic upgrades, Azure support coverage, and integration with Azure Policy for compliance enforcement.

## Prerequisites

- An AKS cluster (Kubernetes version 1.22 or later)
- Azure CLI (v2.50 or later)
- The `k8s-extension` and `k8s-configuration` Azure CLI extensions

## Step 1: Install Required Azure CLI Extensions

```bash
# Install the k8s-extension CLI extension
az extension add --name k8s-extension

# Install the k8s-configuration CLI extension
az extension add --name k8s-configuration

# Update extensions if already installed
az extension update --name k8s-extension
az extension update --name k8s-configuration

# Verify the extensions are installed
az extension list --output table
```

## Step 2: Register Required Resource Providers

```bash
# Register the Kubernetes Configuration resource provider
az provider register --namespace Microsoft.KubernetesConfiguration

# Check registration status (wait until "Registered")
az provider show \
  --namespace Microsoft.KubernetesConfiguration \
  --query "registrationState" \
  --output tsv
```

## Step 3: Install the Flux Extension on AKS

The `microsoft.flux` extension installs all Flux CD controllers on your AKS cluster.

```bash
# Set variables
export RESOURCE_GROUP="rg-fluxcd-demo"
export CLUSTER_NAME="aks-fluxcd-demo"

# Install the Flux extension
az k8s-extension create \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name flux \
  --extension-type microsoft.flux \
  --configuration-settings \
    multiTenancy.enforce=false \
    helm-controller.enabled=true \
    source-controller.enabled=true \
    kustomize-controller.enabled=true \
    notification-controller.enabled=true \
    image-automation-controller.enabled=true \
    image-reflector-controller.enabled=true
```

### Verify the Extension Installation

```bash
# Check the extension status
az k8s-extension show \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name flux \
  --output table

# Verify Flux pods are running in the cluster
kubectl get pods -n flux-system

# Check all Flux controllers are healthy
kubectl get deployments -n flux-system
```

## Step 4: Create a Flux Configuration

A `fluxConfiguration` resource defines the Git repository source and the Kustomizations that Flux should reconcile.

```bash
# Create a Flux configuration pointing to a public GitHub repository
az k8s-configuration flux create \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name cluster-config \
  --namespace flux-config \
  --scope cluster \
  --url "https://github.com/my-org/fleet-infra" \
  --branch main \
  --kustomization name=infra path=./infrastructure prune=true \
  --kustomization name=apps path=./apps prune=true dependsOn=["infra"]
```

### Understanding the Configuration Parameters

| Parameter | Description |
|-----------|-------------|
| `--scope` | `cluster` for cluster-wide resources, `namespace` for namespace-scoped |
| `--url` | The Git repository URL (HTTPS or SSH) |
| `--branch` | The branch to track |
| `--kustomization` | One or more Kustomization definitions |

## Step 5: Create a Configuration with Private Repository (SSH)

For private repositories, provide SSH credentials:

```bash
# Create a Flux configuration with SSH authentication
az k8s-configuration flux create \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name app-config \
  --namespace flux-apps \
  --scope cluster \
  --url "ssh://git@github.com/my-org/app-config.git" \
  --branch main \
  --ssh-private-key-file ~/.ssh/flux-deploy-key \
  --kustomization name=apps path=./clusters/production prune=true
```

## Step 6: Create a Configuration with HTTPS and PAT

```bash
# For Azure DevOps or GitHub with Personal Access Token
az k8s-configuration flux create \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name devops-config \
  --namespace flux-devops \
  --scope cluster \
  --url "https://dev.azure.com/my-org/my-project/_git/fleet-infra" \
  --branch main \
  --https-user git \
  --https-key "${AZURE_DEVOPS_PAT}" \
  --kustomization name=infra path=./infrastructure prune=true \
  --kustomization name=apps path=./apps prune=true dependsOn=["infra"]
```

## Step 7: Advanced Kustomization Configuration

You can define detailed Kustomization settings for complex deployments.

```bash
# Create a configuration with advanced Kustomization options
az k8s-configuration flux create \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name production-config \
  --namespace flux-production \
  --scope cluster \
  --url "https://github.com/my-org/fleet-infra" \
  --branch main \
  --interval 5m \
  --kustomization \
    name=cluster-base \
    path=./clusters/production/base \
    prune=true \
    sync_interval=10m \
    retry_interval=1m \
    timeout=5m \
  --kustomization \
    name=cluster-addons \
    path=./clusters/production/addons \
    prune=true \
    dependsOn=["cluster-base"] \
    sync_interval=10m \
  --kustomization \
    name=applications \
    path=./clusters/production/apps \
    prune=true \
    dependsOn=["cluster-addons"] \
    sync_interval=5m
```

## Step 8: Managing Flux Configurations

### List All Configurations

```bash
# List all Flux configurations on the cluster
az k8s-configuration flux list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --output table
```

### View Configuration Details

```bash
# Show detailed information about a specific configuration
az k8s-configuration flux show \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name cluster-config
```

### Update a Configuration

```bash
# Update the branch being tracked
az k8s-configuration flux update \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name cluster-config \
  --branch release/v2.0

# Update a specific Kustomization within the configuration
az k8s-configuration flux kustomization update \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name cluster-config \
  --kustomization-name apps \
  --path ./apps/v2 \
  --prune true
```

### Delete a Configuration

```bash
# Delete a Flux configuration (this also removes deployed resources if prune was enabled)
az k8s-configuration flux delete \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name cluster-config \
  --yes
```

## Step 9: Using ARM Templates for Flux Configuration

For infrastructure-as-code workflows, you can define Flux configurations in ARM templates.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "clusterName": {
      "type": "string",
      "defaultValue": "aks-fluxcd-demo"
    },
    "gitRepoUrl": {
      "type": "string",
      "defaultValue": "https://github.com/my-org/fleet-infra"
    }
  },
  "resources": [
    {
      "type": "Microsoft.KubernetesConfiguration/fluxConfigurations",
      "apiVersion": "2023-05-01",
      "name": "cluster-config",
      "scope": "[format('Microsoft.ContainerService/managedClusters/{0}', parameters('clusterName'))]",
      "properties": {
        "scope": "cluster",
        "namespace": "flux-config",
        "sourceKind": "GitRepository",
        "gitRepository": {
          "url": "[parameters('gitRepoUrl')]",
          "repositoryRef": {
            "branch": "main"
          },
          "syncIntervalInSeconds": 300
        },
        "kustomizations": {
          "infra": {
            "path": "./infrastructure",
            "prune": true,
            "syncIntervalInSeconds": 600
          },
          "apps": {
            "path": "./apps",
            "prune": true,
            "dependsOn": ["infra"],
            "syncIntervalInSeconds": 300
          }
        }
      }
    }
  ]
}
```

## Step 10: Monitoring the Extension

```bash
# Check the compliance state of all configurations
az k8s-configuration flux list \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --query "[].{Name:name, State:complianceState, Provisioning:provisioningState}" \
  --output table

# View Flux controller logs
kubectl logs -n flux-system deployment/source-controller --tail=50
kubectl logs -n flux-system deployment/kustomize-controller --tail=50

# Check Flux custom resources
kubectl get gitrepositories -A
kubectl get kustomizations -A
```

## Upgrading the Extension

The AKS GitOps extension supports automatic minor version upgrades. For major version updates:

```bash
# Check current version
az k8s-extension show \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name flux \
  --query "version" \
  --output tsv

# Update to a specific version
az k8s-extension update \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name flux \
  --version "1.12.0"
```

## Troubleshooting

### Extension Installation Fails

```bash
# Check the extension status and error messages
az k8s-extension show \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name flux \
  --query "{Status:provisioningState, Error:errorInfo}"

# Check for pod issues in the flux-system namespace
kubectl get pods -n flux-system
kubectl describe pods -n flux-system -l app.kubernetes.io/part-of=flux
```

### Configuration Not Compliant

```bash
# Get detailed status of a non-compliant configuration
az k8s-configuration flux show \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --cluster-type managedClusters \
  --name cluster-config \
  --query "statuses"
```

## Conclusion

The AKS GitOps extension provides a managed, Azure-native approach to running Flux CD on your Kubernetes clusters. By leveraging `az k8s-extension` and `az k8s-configuration flux` commands, you can install, configure, and manage Flux CD without directly interacting with Kubernetes resources. This integration enables centralized management across multiple clusters, compliance enforcement through Azure Policy, and enterprise support from Microsoft.
