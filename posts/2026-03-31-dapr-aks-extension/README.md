# How to Use Dapr AKS Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AKS, Azure, Extension, Kubernetes, Deployment

Description: Install and manage Dapr on Azure Kubernetes Service using the AKS extension, which provides automated upgrades, monitoring integration, and simplified lifecycle management.

---

The Dapr AKS extension provides a managed way to install and operate Dapr on Azure Kubernetes Service. Unlike a manual Helm installation, the AKS extension handles automatic upgrades, integrates with Azure Monitor, and provides lifecycle management through the Azure CLI and Portal.

## Prerequisites

```bash
# Install the AKS extension CLI extension
az extension add --name k8s-extension

# Verify the extension is installed
az extension show --name k8s-extension --query "{Version:version}" --output table
```

## Install the Dapr AKS Extension

```bash
# Install Dapr extension on an existing AKS cluster
az k8s-extension create \
  --resource-group my-rg \
  --cluster-name my-aks-cluster \
  --cluster-type managedClusters \
  --name dapr \
  --extension-type Microsoft.Dapr \
  --auto-upgrade-minor-version true

# Check installation status
az k8s-extension show \
  --resource-group my-rg \
  --cluster-name my-aks-cluster \
  --cluster-type managedClusters \
  --name dapr \
  --query "installState"
```

## Configure the Extension with Custom Settings

```bash
# Install with custom configuration
az k8s-extension create \
  --resource-group my-rg \
  --cluster-name my-aks-cluster \
  --cluster-type managedClusters \
  --name dapr \
  --extension-type Microsoft.Dapr \
  --configuration-settings \
    global.ha.enabled=true \
    dapr_operator.replicaCount=2 \
    dapr_sentry.replicaCount=2
```

## Verify the Installation

```bash
# List all extensions on the cluster
az k8s-extension list \
  --resource-group my-rg \
  --cluster-name my-aks-cluster \
  --cluster-type managedClusters \
  --output table

# Check Dapr pods
kubectl get pods -n dapr-system

# Check Dapr version via AKS extension
az k8s-extension show \
  --resource-group my-rg \
  --cluster-name my-aks-cluster \
  --cluster-type managedClusters \
  --name dapr \
  --query version
```

## Update the Extension

```bash
# Update to a specific version
az k8s-extension update \
  --resource-group my-rg \
  --cluster-name my-aks-cluster \
  --cluster-type managedClusters \
  --name dapr \
  --version 1.13.0

# Enable automatic minor version upgrades
az k8s-extension update \
  --resource-group my-rg \
  --cluster-name my-aks-cluster \
  --cluster-type managedClusters \
  --name dapr \
  --auto-upgrade-minor-version true
```

## Deploy a Dapr Application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: order-service
        image: myrepo/order-service:latest
        ports:
        - containerPort: 8080
```

## Enable Diagnostic Settings

```bash
# Enable Azure Monitor integration for Dapr metrics
az monitor diagnostic-settings create \
  --resource "/subscriptions/SUB_ID/resourceGroups/my-rg/providers/Microsoft.ContainerService/managedClusters/my-aks-cluster" \
  --name dapr-diagnostics \
  --workspace "/subscriptions/SUB_ID/resourceGroups/my-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace" \
  --metrics '[{"category": "AllMetrics", "enabled": true}]' \
  --logs '[{"category": "kube-apiserver", "enabled": true}]'
```

## Remove the Extension

```bash
az k8s-extension delete \
  --resource-group my-rg \
  --cluster-name my-aks-cluster \
  --cluster-type managedClusters \
  --name dapr \
  --yes
```

## Summary

The Dapr AKS extension simplifies Dapr lifecycle management on AKS by providing Azure-native installation, automatic minor version upgrades, and integration with Azure Monitor. The extension manages the Dapr control plane as a first-class AKS add-on, reducing the operational overhead of manual Helm chart management and aligning Dapr upgrades with AKS cluster maintenance windows.
