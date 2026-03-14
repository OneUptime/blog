# Install Azure CNI with Cilium on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, AKS, Azure, CNI, Kubernetes, Networking, eBPF

Description: Step-by-step guide to installing Cilium as the CNI plugin on Azure Kubernetes Service using the Azure CNI Powered by Cilium feature.

---

## Introduction

Azure Kubernetes Service supports Cilium as a CNI through the "Azure CNI Powered by Cilium" feature. This integration combines Azure's native IP address management (IPAM) with Cilium's eBPF-based networking, providing advanced network policy enforcement, transparent encryption, and deep observability without replacing Azure's networking plane.

This guide covers enabling Cilium CNI on a new AKS cluster and verifying the installation with Cilium's connectivity tests.

## Prerequisites

- Azure CLI (`az`) installed and authenticated
- Azure subscription with AKS permissions
- `kubectl` installed
- `cilium` CLI installed (`curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/latest/download/cilium-linux-amd64.tar.gz`)

## Step 1: Register the Azure CNI Cilium Feature

```bash
# Register the required Azure feature flags for AKS Cilium CNI
az feature register \
  --namespace Microsoft.ContainerService \
  --name AzureOverlayPreview

az feature register \
  --namespace Microsoft.ContainerService \
  --name CiliumDataplane

# Wait for feature registration (this may take a few minutes)
az feature show \
  --namespace Microsoft.ContainerService \
  --name CiliumDataplane \
  --query properties.state

# Refresh the provider registration after features are registered
az provider register --namespace Microsoft.ContainerService
```

## Step 2: Create an AKS Cluster with Cilium CNI

```bash
# Set variables for the cluster
RESOURCE_GROUP="my-aks-rg"
CLUSTER_NAME="my-cilium-cluster"
LOCATION="eastus"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create AKS cluster with Azure CNI Overlay powered by Cilium
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --location $LOCATION \
  --network-plugin azure \
  --network-plugin-mode overlay \
  # Enable Cilium as the dataplane
  --network-dataplane cilium \
  --pod-cidr 192.168.0.0/16 \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --generate-ssh-keys
```

## Step 3: Get Credentials and Verify Installation

```bash
# Get kubectl credentials for the new cluster
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME

# Verify Cilium pods are running in the kube-system namespace
kubectl get pods -n kube-system -l k8s-app=cilium

# Check Cilium agent status on each node
kubectl exec -n kube-system ds/cilium -- cilium status

# Use the Cilium CLI for a comprehensive status check
cilium status --wait
```

## Step 4: Enable Hubble for Network Observability

Hubble is Cilium's built-in network observability layer:

```bash
# Enable Hubble on the existing AKS cluster with Cilium
az aks update \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --enable-azure-monitor-metrics

# Enable Hubble via Cilium CLI
cilium hubble enable --ui

# Port-forward to access Hubble UI
cilium hubble ui &

# Use Hubble CLI to observe network flows
hubble observe --namespace production --follow
```

## Step 5: Apply a Cilium Network Policy

```yaml
# cilium-network-policy.yaml - Allow only frontend to access backend
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
```

## Best Practices

- Use Azure CNI Overlay mode with Cilium to conserve IP addresses in large clusters
- Enable Hubble for network flow visibility before deploying production workloads
- Apply `CiliumNetworkPolicy` resources gradually, starting with deny-all and explicitly allowing required traffic
- Monitor Cilium agent health with `cilium status` as part of your cluster health checks
- Use Azure Policy to enforce network policy requirements across all AKS clusters in your subscription

## Conclusion

Azure CNI Powered by Cilium provides the best of both worlds: Azure's native IP management and Cilium's eBPF-based network policies, transparent encryption, and deep observability. The integration is seamless for AKS users and provides significantly better network policy enforcement and visibility compared to the standard Azure CNI. Enable Hubble alongside Cilium for production observability from day one.
