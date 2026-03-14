# Install Calico on AKS Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, AKS, Azure

Description: A step-by-step guide to installing Calico network policy enforcement on Azure Kubernetes Service, covering both Calico policy-only mode and full CNI installation.

---

## Introduction

Azure Kubernetes Service supports Calico for network policy enforcement. AKS can run Calico in two modes: as a network policy engine alongside Azure CNI (policy-only mode), or as a full CNI replacement. Most AKS users choose the policy-only mode, which uses Calico for network policy while retaining Azure's networking plane.

This guide walks through installing Calico on AKS using the recommended approach for each mode.

## Prerequisites

- Azure CLI installed and authenticated
- `kubectl` installed and configured
- `calicoctl` installed (`curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o calicoctl`)
- AKS cluster (for existing clusters) or ability to create a new one

## Step 1: Create AKS Cluster with Calico Policy Engine

For new clusters, enable Calico at cluster creation time:

```bash
# Create AKS cluster with Calico network policy enabled
az aks create \
  --resource-group my-resource-group \
  --name my-aks-cluster \
  --network-plugin azure \
  # Enable Calico as the network policy provider
  --network-policy calico \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --generate-ssh-keys

# Get credentials for the new cluster
az aks get-credentials \
  --resource-group my-resource-group \
  --name my-aks-cluster
```

For existing clusters, update to enable Calico:

```bash
# Enable Calico network policy on an existing AKS cluster
az aks update \
  --resource-group my-resource-group \
  --name my-aks-cluster \
  --network-policy calico
```

## Step 2: Verify Calico Installation

```bash
# Check that Calico pods are running
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l k8s-app=calico-typha

# Verify Calico node status
kubectl exec -n kube-system ds/calico-node -- calicoctl node status

# Check Calico version
kubectl exec -n kube-system ds/calico-node -- calico-node --version
```

## Step 3: Configure calicoctl for AKS

```bash
# Set CALICO_DATASTORE_TYPE for Kubernetes datastore mode (AKS default)
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify calicoctl can connect to the cluster
calicoctl get nodes

# List existing IPPools
calicoctl get ippools -o wide
```

## Step 4: Apply Calico Network Policies

Create a deny-all default policy for a namespace:

```yaml
# deny-all-policy.yaml - Default deny all ingress and egress for the production namespace
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  selector: all()
  # Empty ingress/egress rules mean deny all
  types:
    - Ingress
    - Egress
```

Allow specific traffic between services:

```yaml
# allow-frontend-backend.yaml - Allow frontend to reach backend on port 8080
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  selector: app == 'backend'
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'frontend'
      destination:
        ports:
          - 8080
  types:
    - Ingress
```

Allow DNS egress for all pods:

```yaml
# allow-dns-egress.yaml - Allow all pods to reach kube-dns
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  selector: all()
  egress:
    - action: Allow
      protocol: UDP
      destination:
        selector: k8s-app == 'kube-dns'
        namespaceSelector: kubernetes.io/metadata.name == 'kube-system'
        ports:
          - 53
    - action: Allow
      protocol: TCP
      destination:
        selector: k8s-app == 'kube-dns'
        namespaceSelector: kubernetes.io/metadata.name == 'kube-system'
        ports:
          - 53
  types:
    - Egress
```

## Best Practices

- Always create a deny-all policy first, then explicitly allow required traffic
- Test network policies in a dedicated test namespace before applying to production
- Use Calico's `GlobalNetworkPolicy` for cluster-wide rules (like allowing DNS)
- Monitor Calico node status regularly - unhealthy Calico nodes can cause network partitions
- Use `calicoctl get networkpolicies -A` to audit all policies across namespaces

## Conclusion

Installing Calico on AKS gives you powerful, Calico-native network policy enforcement while retaining Azure's networking infrastructure. The policy-only mode is the recommended approach for AKS, providing the best balance between Azure integration and Calico's policy capabilities. Start with a deny-all policy and explicitly allow traffic to build a secure, auditable network policy framework.
