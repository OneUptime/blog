# How to Connect Portainer to an Azure AKS Cluster - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, AKS, Kubernetes, Cloud

Description: Connect Portainer to an Azure Kubernetes Service (AKS) cluster for visual management of Azure-hosted Kubernetes workloads.

## Introduction

Azure Kubernetes Service (AKS) is Microsoft's managed Kubernetes service. Connecting AKS to Portainer gives teams a visual interface for deploying and managing applications without requiring Azure portal or kubectl knowledge. This guide covers connecting AKS via kubeconfig import and the Portainer Agent. In current Portainer releases, kubeconfig import is a legacy feature in Portainer Business Edition, and the classic Portainer Agent is also considered legacy.

## Prerequisites

- Azure CLI installed and authenticated (`az login`)
- An existing AKS cluster
- Portainer running and accessible
- Portainer Business Edition if you plan to use kubeconfig import
- AKS local accounts enabled if you plan to use `az aks get-credentials --admin`
- Load balancer support available in the cluster if you plan to use kubeconfig import

## Step 1: Get AKS Credentials

```bash
# Get an admin kubeconfig for your AKS cluster.
# Portainer import requires cluster-admin credentials in a self-contained kubeconfig.
# On Microsoft Entra-integrated clusters, clusterUser kubeconfigs commonly use exec/kubelogin.

az aks get-credentials \
  --resource-group my-resource-group \
  --name my-aks-cluster \
  --admin \
  --file aks-portainer.kubeconfig

# Verify connectivity
kubectl --kubeconfig=aks-portainer.kubeconfig cluster-info
kubectl --kubeconfig=aks-portainer.kubeconfig get nodes
```

## Step 2: Build a Self-Contained Kubeconfig

```bash
# Flatten the kubeconfig so Portainer can import a single self-contained file
kubectl config view \
  --kubeconfig=aks-portainer.kubeconfig \
  --raw \
  --flatten \
  --minify > portainer-aks.kubeconfig
```

## Step 3: Import AKS into Portainer

Test the kubeconfig first:
```bash
kubectl --kubeconfig=portainer-aks.kubeconfig get nodes
```

Then in Portainer, go to **Environments** -> **Add environment** -> **Kubernetes** -> **Import**, select `portainer-aks.kubeconfig`, and click **Connect**. This import workflow is only available in Portainer Business Edition.

## Method 2: Deploy Portainer Agent in AKS

A Portainer agent-only Helm chart is not currently documented for Kubernetes agent deployments. Portainer documents this workflow with Portainer-provided YAML manifests instead, and the classic Agent is considered a legacy option.

```bash
# In Portainer, go to Environments -> Add environment -> Kubernetes -> Agent.
# Choose either "Kubernetes via load balancer" or "Kubernetes via node port",
# copy the generated manifest command, and run it against your AKS cluster.

# Verify the agent deployment
kubectl --kubeconfig=aks-portainer.kubeconfig get pods -n portainer
kubectl --kubeconfig=aks-portainer.kubeconfig get svc -n portainer
```

When adding the environment in Portainer, use the agent endpoint without a protocol: port `9001` for a LoadBalancer deployment or port `30778` for a NodePort deployment.

## AKS-Specific Considerations

### Microsoft Entra ID Integration

AKS supports Microsoft Entra ID for authentication. On Kubernetes 1.24+ Entra-integrated clusters, `az aks get-credentials` returns `clusterUser` kubeconfigs in `exec` format that rely on `kubelogin`. For Portainer kubeconfig import, use a self-contained kubeconfig. `az aks get-credentials --admin` returns a certificate-based kubeconfig, but it requires AKS local accounts to be enabled.

### Private AKS Clusters

For private AKS (API server not public):
```bash
# Kubeconfig import requires Portainer to reach the AKS API server.
# The classic Portainer Agent still requires Portainer Server -> Agent connectivity.

# If the cluster must initiate connectivity outbound to Portainer, use the Edge Agent.
```

### AKS Node Pools

Portainer can view nodes across multiple node pools. Check node labels to understand pool membership:
```bash
kubectl get nodes --show-labels --kubeconfig=aks-portainer.kubeconfig | grep kubernetes.azure.com/agentpool
```

## Conclusion

AKS clusters can be connected to Portainer via kubeconfig import or agent-based methods. For kubeconfig import, use a self-contained cluster-admin kubeconfig; on Microsoft Entra-integrated clusters that usually means `az aks get-credentials --admin`, which requires local accounts to be enabled. For remote or private deployments, prefer the Edge Agent. The classic Portainer Agent is a legacy option and still requires Portainer Server to reach the agent endpoint.
