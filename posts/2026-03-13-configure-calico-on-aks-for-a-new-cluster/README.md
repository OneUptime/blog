# Configure Calico on AKS for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, AKS, Azure

Description: A step-by-step guide to deploying Calico as the network policy engine on a new Azure Kubernetes Service cluster, enabling advanced network policies beyond what Azure CNI provides natively.

---

## Introduction

Azure Kubernetes Service supports Calico as a network policy provider alongside Azure CNI. While Azure CNI handles pod networking and IP address assignment using Azure VNet IPs, Azure-managed Calico enforces standard Kubernetes NetworkPolicy resources.

This combination is popular for teams that need the VNet integration of Azure CNI with Kubernetes network policy enforcement. AKS can provision Calico automatically during cluster creation, making it straightforward to deploy.

This guide covers creating a new AKS cluster with Calico as the network policy provider and verifying the installation is healthy.

## Prerequisites

- Azure CLI installed and authenticated (`az login`)
- An Azure subscription with sufficient quota
- `kubectl` installed

## Step 1: Create an AKS Cluster with Calico Network Policy

Use the Azure CLI to create an AKS cluster with Calico as the network policy provider.

```bash
# Set your environment variables

RESOURCE_GROUP="aks-calico-rg"
CLUSTER_NAME="calico-aks-cluster"
LOCATION="eastus"

# Create the resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create the AKS cluster with Azure CNI and Calico network policy
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --location $LOCATION \
  --network-plugin azure \
  --network-policy calico \
  --node-count 3 \
  --node-vm-size Standard_DS2_v2 \
  --generate-ssh-keys
```

## Step 2: Get Credentials and Verify Access

Authenticate to the new cluster and verify it is healthy.

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME

# Verify all nodes are Ready
kubectl get nodes -o wide

# Check that Calico system pods are running
kubectl get pods -n kube-system | grep calico
```

## Step 3: Confirm the Network Policy Configuration

Confirm that AKS reports Calico as the configured network policy engine.

```bash
# Confirm the AKS network profile
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "networkProfile.{networkPlugin:networkPlugin,networkPolicy:networkPolicy}" \
  --output table
```

## Step 4: Apply Your First Network Policy

Test Calico policy enforcement with a simple deny-all and allow policy.

```yaml
# default-deny.yaml
# Default deny-all ingress policy for the production namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

```yaml
# allow-web-policy.yaml
# Allow ingress to web pods only from the frontend namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: frontend
    ports:
    - protocol: TCP
      port: 8080
```

```bash
# Apply the namespace and policies
kubectl create namespace production
kubectl create namespace frontend
kubectl apply -f default-deny.yaml
kubectl apply -f allow-web-policy.yaml

# Verify policies are applied
kubectl get networkpolicy -n production
```

## Step 5: Understand Calico-Specific Policy APIs

AKS-managed Calico supports standard Kubernetes NetworkPolicy resources. Calico-specific APIs such as GlobalNetworkPolicy require a self-managed Calico installation and are not part of the AKS-managed Calico feature set.

```yaml
# namespace-default-deny.yaml
# Standard Kubernetes NetworkPolicy as a namespace-wide default deny
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

```bash
# Apply the namespace-wide policy
kubectl apply -f namespace-default-deny.yaml

# Verify the policy
kubectl get networkpolicy -n production
```

## Best Practices

- Use Azure CNI with Calico for full VNet integration and standard Kubernetes NetworkPolicy enforcement
- Apply default-deny policies per namespace as soon as you create them
- Use namespace-scoped Kubernetes NetworkPolicy resources for AKS-managed Calico
- Monitor Calico pod health regularly: `kubectl get pods -n kube-system | grep calico`
- Use self-managed Calico if you need Calico-specific APIs such as GlobalNetworkPolicy or Calico flow logs

## Conclusion

Deploying Calico on AKS provides a useful combination of Azure's native networking with Kubernetes NetworkPolicy enforcement. For teams that need Azure VNet integration and standard Kubernetes policy controls, AKS-managed Calico can enforce namespace and workload isolation without sacrificing the cloud-native networking benefits of Azure CNI.
