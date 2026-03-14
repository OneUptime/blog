# Configure Calico on EKS for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, EKS, AWS

Description: Learn how to install and configure Calico on a new Amazon EKS cluster, replacing or augmenting the default VPC CNI with Calico's powerful network policy and IPAM capabilities.

---

## Introduction

Amazon EKS uses the AWS VPC CNI plugin by default, which assigns VPC IPs directly to pods. Calico can be deployed on EKS in two modes: as a policy-only engine that works alongside the AWS VPC CNI, or as a full CNI replacement that uses its own IPAM and overlay networking.

For most EKS deployments, the recommended approach is to use Calico as the network policy engine alongside the AWS VPC CNI, keeping the native VPC networking while gaining Calico's rich policy capabilities including GlobalNetworkPolicy and host endpoint protection.

This guide walks through installing Calico as the network policy provider on a new EKS cluster and applying your first network policies.

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- `eksctl` installed for cluster creation
- `kubectl` installed
- `calicoctl` CLI installed
- Appropriate IAM permissions for EKS cluster creation

## Step 1: Create an EKS Cluster

Create a new EKS cluster using `eksctl`.

```bash
# Create a basic EKS cluster (without a network policy provider - we'll add Calico)
eksctl create cluster \
  --name calico-eks-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed

# Verify the cluster is ready
kubectl get nodes -o wide
```

## Step 2: Install Calico on EKS

Install Calico using the Tigera operator or via direct manifest.

```bash
# Install the Tigera Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Create the Calico installation resource
# For EKS with VPC CNI (policy-only mode), configure accordingly
```

```yaml
# calico-installation.yaml
# Calico installation for EKS using policy-only mode with VPC CNI
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use the Calico CNI provider in policy-only mode
  # This keeps AWS VPC CNI for networking while Calico handles policy
  cni:
    type: AmazonVPC
  # Disable Calico IPAM - use AWS VPC CNI IPAM
  calicoNetwork:
    bgp: Disabled
    ipPools: []
```

```bash
# Apply the Calico installation
kubectl apply -f calico-installation.yaml

# Wait for Calico to become ready
kubectl wait --for=condition=Available tigerastatus/calico --timeout=5m

# Verify Calico pods are running
kubectl get pods -n calico-system
```

## Step 3: Configure calicoctl for EKS

Set up `calicoctl` with the correct datastore configuration.

```bash
# Download calicoctl
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o calicoctl && chmod +x calicoctl && sudo mv calicoctl /usr/local/bin/

# Set the datastore to Kubernetes API
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config

# Verify connectivity
calicoctl get nodes
```

## Step 4: Apply Network Policies

Deploy workloads and apply Calico network policies.

```yaml
# deny-all-namespace.yaml
# Default deny for the production namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

```yaml
# allow-app-traffic.yaml
# Allow traffic between frontend and backend within production namespace
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend-backend
  namespace: production
spec:
  selector: app == "backend"
  ingress:
  - action: Allow
    source:
      selector: app == "frontend"
    destination:
      ports: [8080]
  - action: Deny
```

```bash
# Create the namespace and apply policies
kubectl create namespace production
calicoctl apply -f allow-app-traffic.yaml
kubectl apply -f deny-all-namespace.yaml
```

## Step 5: Verify Policy Enforcement

Test that network policies are being enforced correctly.

```bash
# Deploy test pods
kubectl run frontend --image=nginx -n production -l app=frontend
kubectl run backend --image=nginx -n production -l app=backend
kubectl run unrelated --image=nginx -n production -l app=unrelated

# Test connectivity - frontend -> backend should work
kubectl exec -n production frontend -- curl -s --max-time 5 http://backend

# Test connectivity - unrelated -> backend should be blocked
kubectl exec -n production unrelated -- curl --max-time 5 http://backend

# Check Calico's view of endpoint policies
calicoctl get weps -n production
```

## Best Practices

- Use Calico in policy-only mode on EKS to retain VPC CNI's native pod networking and ENI benefits
- Apply GlobalNetworkPolicy for baseline cluster-wide rules before deploying workloads
- Monitor Calico pod health: `kubectl get pods -n calico-system`
- Upgrade Calico independently from EKS - check the Calico-Kubernetes compatibility matrix first
- Enable VPC Flow Logs to complement Calico policy logging for full network audit coverage

## Conclusion

Calico on EKS gives you enterprise-grade network policy capabilities on top of AWS's native VPC networking. With GlobalNetworkPolicy support, host endpoint protection, and the full Calico policy API available, you can enforce sophisticated zero-trust security postures on EKS workloads while retaining the performance and integration benefits of the AWS VPC CNI plugin.
