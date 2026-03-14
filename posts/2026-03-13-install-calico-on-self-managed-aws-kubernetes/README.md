# Install Calico on Self-Managed AWS Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, AWS, Kubernetes, EC2, Networking, CNI, Self-Managed

Description: Step-by-step guide to installing Calico as the CNI on self-managed Kubernetes clusters running on AWS EC2 instances.

---

## Introduction

When running Kubernetes on AWS EC2 without EKS — using kubeadm, kOps, or similar tools — you have full control over CNI selection. Calico is a popular choice for self-managed AWS Kubernetes clusters because it provides both pod networking (without requiring VPC CNI license limitations) and advanced network policy enforcement.

This guide covers installing Calico on a kubeadm-provisioned Kubernetes cluster on AWS EC2, using Calico's VXLAN overlay for cross-node communication.

## Prerequisites

- AWS EC2 instances with Kubernetes installed via kubeadm (control plane + workers)
- `kubectl` access with cluster-admin privileges
- `calicoctl` installed on your management machine
- Security groups allowing VXLAN (UDP 4789) and BGP (TCP 179) between nodes

## Step 1: Prepare AWS Security Groups

Before installing Calico, ensure EC2 security groups allow necessary traffic:

```bash
# Allow VXLAN traffic between cluster nodes (for Calico VXLAN mode)
aws ec2 authorize-security-group-ingress \
  --group-id sg-your-cluster-sg \
  --protocol udp \
  --port 4789 \
  --source-group sg-your-cluster-sg

# Allow BGP if using Calico's BGP mode instead of VXLAN
aws ec2 authorize-security-group-ingress \
  --group-id sg-your-cluster-sg \
  --protocol tcp \
  --port 179 \
  --source-group sg-your-cluster-sg

# Allow Calico Typha communications
aws ec2 authorize-security-group-ingress \
  --group-id sg-your-cluster-sg \
  --protocol tcp \
  --port 5473 \
  --source-group sg-your-cluster-sg
```

## Step 2: Initialize Kubernetes with kubeadm

When initializing the cluster, specify a pod CIDR that does not overlap with VPC subnets:

```bash
# Initialize the control plane
# The pod-network-cidr must not overlap with your VPC CIDR
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=<PRIVATE_IP> \
  --apiserver-cert-extra-sans=<PUBLIC_IP>

# Set up kubeconfig
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Step 3: Install Calico

```bash
# Install the Tigera Operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Wait for the operator
kubectl wait --for=condition=Available deployment/tigera-operator \
  -n tigera-operator --timeout=120s
```

Create the Calico installation for AWS:

```yaml
# calico-installation-aws.yaml - Calico with VXLAN for AWS self-managed clusters
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use Calico's own CNI for pod networking
  cni:
    type: Calico
  calicoNetwork:
    ipPools:
      - name: default-ipv4-ippool
        # Must match kubeadm --pod-network-cidr
        cidr: 192.168.0.0/16
        # Use VXLAN for overlay networking on AWS
        # (BGP requires routing configuration in VPC)
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
```

Apply and wait:

```bash
# Apply the installation configuration
kubectl apply -f calico-installation-aws.yaml

# Monitor the installation progress
kubectl watch --for=condition=Ready tigerastatus/calico --timeout=300s

# Verify all nodes are now Ready (Calico provides the pod network)
kubectl get nodes
kubectl get pods -n calico-system
```

## Step 4: Configure calicoctl

```bash
# Configure calicoctl for Kubernetes datastore
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify connectivity
calicoctl get nodes -o wide

# Check the default IP pool was created
calicoctl get ippool default-ipv4-ippool -o yaml
```

## Step 5: Apply Network Policies

```yaml
# production-network-policies.yaml - Network policies for production namespace
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  selector: all()
  types:
    - Ingress
    - Egress
---
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-dns-and-internal
  namespace: production
spec:
  selector: all()
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Allow
      destination:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
  ingress:
    - action: Allow
      source:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
  types:
    - Ingress
    - Egress
```

## Best Practices

- Use VXLAN encapsulation on AWS to avoid needing VPC route table management for pod CIDRs
- Disable AWS source/destination check on EC2 instances if using BGP mode instead of VXLAN
- Size your pod CIDR generously (at least /16) to accommodate cluster growth
- Enable Calico Typha for clusters with more than 50 nodes to reduce API server load
- Use AWS placement groups for control plane nodes to improve etcd and API server latency

## Conclusion

Installing Calico on self-managed AWS Kubernetes gives you a production-ready CNI with advanced networking features that surpass what EKS VPC CNI offers by default. VXLAN mode is the simplest setup for most teams as it requires no VPC routing changes. Once installed, Calico's network policies provide the security foundation for multi-tenant and zero-trust workloads.
