# Configure Azure CNI with Cilium on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, EBPF

Description: Learn how to configure Azure CNI with Cilium as the network policy engine on Azure Kubernetes Service, combining Azure's native networking with Cilium's advanced policy capabilities.

---

## Introduction

Azure Kubernetes Service supports using Cilium as the network policy engine alongside Azure CNI for pod networking. This combination gives you Azure's native VNet integration and IP address management while leveraging Cilium's eBPF-based policy enforcement, Hubble observability, and advanced security features.

Starting with AKS, Microsoft has made Cilium available as a managed network policy option through the Azure CNI Overlay and Azure CNI Powered by Cilium modes. This means you get enterprise-grade support for the underlying Kubernetes cluster while running one of the most capable network policy engines available.

This guide walks through creating an AKS cluster with Azure CNI and Cilium, verifying the installation, and applying your first Cilium network policies.

## Prerequisites

- Azure CLI installed and authenticated (`az login`)
- An Azure subscription with sufficient quota
- `kubectl` installed
- `cilium` CLI installed

## Step 1: Create an AKS Cluster with Azure CNI Powered by Cilium

Use the Azure CLI to create a cluster with Cilium as the network dataplane.

```bash
# Set variables for your cluster configuration
RESOURCE_GROUP="my-rg"
CLUSTER_NAME="my-aks-cluster"
LOCATION="eastus"

# Create the resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create an AKS cluster with Azure CNI Overlay and Cilium dataplane
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --location $LOCATION \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-dataplane cilium \
  --node-count 3 \
  --node-vm-size Standard_DS2_v2 \
  --generate-ssh-keys
```

## Step 2: Authenticate and Verify Cluster Access

Get credentials and confirm the cluster is running with Cilium.

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME

# Verify nodes are Ready
kubectl get nodes

# Check Cilium status - all agents should be OK
cilium status

# Verify Cilium DaemonSet is running on all nodes
kubectl -n kube-system get daemonset cilium
```

## Step 3: Verify Cilium CNI and Network Policy Support

Confirm that Cilium is functioning as both the CNI and network policy engine.

```bash
# Run the full Cilium connectivity test suite
cilium connectivity test

# Check that Cilium endpoints are registered for all pods
cilium endpoint list

# Confirm that network policy enforcement is enabled
cilium config view | grep -E "enable-policy|policy-enforcement"
```

## Step 4: Apply a CiliumNetworkPolicy

Test that Cilium network policies are enforced on the AKS cluster.

```yaml
# test-policy.yaml
# Allow only pods labeled app=frontend to reach pods labeled app=backend on port 8080
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: default
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

```bash
# Apply the test policy
kubectl apply -f test-policy.yaml

# Verify the policy is applied
kubectl get cnp -n default
```

## Step 5: Enable Hubble for Observability

Hubble provides network flow visibility on AKS with Cilium.

```bash
# Enable Hubble observability
cilium hubble enable --ui

# Access the Hubble UI via port-forward
cilium hubble ui
```

## Best Practices

- Use Azure CNI Overlay mode to conserve VNet IP space - pods get IPs from a private overlay range
- Enable Hubble from the start to gain visibility into network flows before issues arise
- Use `CiliumClusterwideNetworkPolicy` for cluster-wide baseline security rules
- Monitor Cilium agent health using Azure Monitor and the Cilium Prometheus metrics
- Test network policies in a non-production namespace before applying to production workloads

## Conclusion

Azure CNI Powered by Cilium on AKS gives you the best of both worlds: Azure's native networking infrastructure and Cilium's advanced eBPF-based security and observability. With managed Cilium support from Microsoft, you can run production-grade Kubernetes workloads with confidence, knowing that both the platform and the network policy engine are enterprise-supported.
