# Configure Calico on IBM Kubernetes Service for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, IBM Kubernetes Service

Description: Learn how to configure Calico on a new IBM Kubernetes Service cluster, leveraging IKS's built-in Calico integration for advanced network policy enforcement.

---

## Introduction

IBM Kubernetes Service (IKS) ships with Calico pre-installed as the default CNI and network policy provider. This makes IKS one of the most Calico-friendly managed Kubernetes services - you get Calico network policy features including GlobalNetworkPolicy and host endpoint protection right out of the box.

IKS uses Calico with the Kubernetes datastore, meaning all Calico resources are stored as Kubernetes CRDs. The IBM Cloud console provides visibility into network policies, and `calicoctl` works seamlessly against IKS clusters with minimal configuration.

This guide covers creating a new IKS cluster with Calico, configuring `calicoctl`, and applying production-ready network policies.

## Prerequisites

- IBM Cloud CLI installed and authenticated (`ibmcloud login`)
- `ibmcloud ks` (Kubernetes Service) plugin installed
- `kubectl` installed
- `calicoctl` CLI installed

## Step 1: Create an IKS Cluster

Create a new IKS cluster - Calico is automatically included.

```bash
# Log in to IBM Cloud

ibmcloud login -a https://cloud.ibm.com

# Set your target region and resource group
ibmcloud target -r us-south -g default

# List available classic zones for your region
ibmcloud ks zone ls --provider classic --region-only

# Create a standard IKS cluster with Calico pre-installed
ibmcloud ks cluster create classic \
  --name calico-iks-cluster \
  --zone dal10 \
  --flavor b3c.4x16 \
  --workers 3 \
  --public-vlan <public-vlan-id> \
  --private-vlan <private-vlan-id>

# Monitor cluster creation progress
ibmcloud ks cluster get --cluster calico-iks-cluster
```

## Step 2: Configure kubectl and calicoctl for IKS

Set up CLI tools to access the new cluster.

```bash
# Download the cluster configuration
ibmcloud ks cluster config --cluster calico-iks-cluster

# Verify kubectl access
kubectl get nodes

# Configure calicoctl to use the Kubernetes datastore
export DATASTORE_TYPE=kubernetes

# Optional: download Calico configuration files and certificates for calicoctl
ibmcloud ks cluster config --cluster calico-iks-cluster --admin --network

# Verify calicoctl connectivity
calicoctl get nodes
```

## Step 3: View Pre-Installed Calico Configuration

IKS installs Calico with a default configuration - review it before making changes.

```bash
# View the default IP pool
calicoctl get ippools -o yaml

# Check existing global network policies (IKS pre-installs some)
calicoctl get GlobalNetworkPolicy -o wide

# View Calico host endpoints
calicoctl get hostendpoint -o yaml

# Check the FelixConfiguration
calicoctl get felixconfiguration default -o yaml
```

## Step 4: Apply Application Network Policies

Create namespace-level policies for your applications.

```yaml
# iks-app-policy.yaml
# Namespace-scoped Calico NetworkPolicy for application isolation
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-app-ingress
  namespace: my-app
spec:
  # Select all pods in the my-app namespace
  selector: all()
  order: 3000
  ingress:
  # Allow traffic from the same namespace
  - action: Allow
    source:
      selector: all()
  # Allow traffic from monitoring namespace
  - action: Allow
    source:
      namespaceSelector: kubernetes.io/metadata.name == "monitoring"
  # Deny all other ingress
  - action: Deny
  egress:
  # Allow DNS
  - action: Allow
    protocol: UDP
    destination:
      ports: [53]
  # Allow traffic to other pods in same namespace
  - action: Allow
    destination:
      selector: all()
  # Allow egress to IBM Cloud services
  - action: Allow
    destination:
      nets:
      - 161.26.0.0/16
  - action: Deny
```

```bash
# Apply the application policy
kubectl create namespace my-app
calicoctl apply -f iks-app-policy.yaml
```

## Step 5: Configure IKS-Specific Host Endpoint Policies

IKS allows host endpoint policies to protect worker node traffic.

```yaml
# iks-host-protection.yaml
# GlobalNetworkPolicy to allow trusted SSH access to public worker host endpoints
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-trusted-worker-ssh
spec:
  order: 900
  selector: ibm.role == "worker_public"
  types:
  - Ingress
  ingress:
  # Allow SSH only from a trusted operations network
  - action: Allow
    protocol: TCP
    source:
      nets:
      - <trusted-operations-cidr>
    destination:
      ports: [22]
```

```bash
# Apply the host protection policy
calicoctl apply -f iks-host-protection.yaml

# Verify all policies
calicoctl get GlobalNetworkPolicy -o wide
calicoctl get NetworkPolicy -n my-app
```

## Best Practices

- Set `DATASTORE_TYPE=kubernetes` when using `calicoctl` with current IKS clusters
- Review IKS's pre-installed global network policies before adding your own to avoid conflicts
- Use `order` values above 1000 for application policies to ensure IBM's system policies take precedence
- Upgrade Calico only through IBM Cloud's managed update process on IKS
- Use IBM Cloud Activity Tracker to audit policy changes in conjunction with Calico's policy logs

## Conclusion

IBM Kubernetes Service's native Calico integration makes it one of the easiest managed Kubernetes platforms for Calico deployments. With Calico pre-installed and configured, you can focus immediately on writing network policies for your applications. Calico policy features such as GlobalNetworkPolicy, host endpoint protection, and IPAM are available from day one on IKS clusters.
