# Configure Calico on AKS for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, azure, aks, kubernetes, networking, cni

Description: A step-by-step guide to deploying Calico as the network policy engine on a new Azure Kubernetes Service cluster, enabling advanced network policies beyond what Azure CNI provides natively.

---

## Introduction

Azure Kubernetes Service supports Calico as a network policy provider alongside Azure CNI. While Azure CNI handles pod networking and IP address assignment using Azure VNet IPs, Calico enforces network policies using its powerful policy engine — giving you access to GlobalNetworkPolicies, host endpoint policies, and other Calico features not available with Azure's native policy implementation.

This combination is popular for teams that need the VNet integration of Azure CNI with the policy richness of Calico. AKS can provision Calico automatically during cluster creation, making it straightforward to deploy.

This guide covers creating a new AKS cluster with Calico as the network policy provider and verifying the installation is healthy.

## Prerequisites

- Azure CLI installed and authenticated (`az login`)
- An Azure subscription with sufficient quota
- `kubectl` installed
- `calicoctl` CLI installed

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
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l k8s-app=calico-typha
```

## Step 3: Install calicoctl for Policy Management

Configure `calicoctl` to manage Calico resources on the AKS cluster.

```bash
# Download calicoctl
curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 \
  -o calicoctl && chmod +x calicoctl

# Configure calicoctl to use the Kubernetes API datastore (default for AKS)
export CALICO_DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config

# Verify calicoctl can connect to the cluster
calicoctl node status
calicoctl get nodes
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
kubectl apply -f default-deny.yaml
kubectl apply -f allow-web-policy.yaml

# Verify policies are applied
kubectl get networkpolicy -n production
```

## Step 5: Use Calico-Specific GlobalNetworkPolicy

Leverage Calico's extended policy capabilities beyond standard Kubernetes NetworkPolicy.

```yaml
# global-deny-all.yaml
# Calico GlobalNetworkPolicy as a cluster-wide default deny
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  order: 1000
  selector: all()
  types:
  - Ingress
  - Egress
  ingress:
  - action: Deny
  egress:
  # Allow DNS to function
  - action: Allow
    protocol: UDP
    destination:
      ports: [53]
  - action: Deny
```

```bash
# Apply the global policy
calicoctl apply -f global-deny-all.yaml

# Verify the global policy
calicoctl get globalnetworkpolicies
```

## Best Practices

- Use Azure CNI with Calico for full VNet integration and advanced policy features
- Apply default-deny policies per namespace as soon as you create them
- Use GlobalNetworkPolicy for cluster-wide baseline security rules
- Monitor Calico pod health regularly: `kubectl get pods -n kube-system -l k8s-app=calico-node`
- Enable Calico's flow logging for audit and troubleshooting purposes

## Conclusion

Deploying Calico on AKS provides a powerful combination of Azure's native networking with Calico's advanced policy engine. With GlobalNetworkPolicy support and the full Calico feature set available alongside Azure VNet integration, you can enforce sophisticated security postures on AKS without sacrificing the cloud-native networking benefits of Azure CNI.
