# Configure Calico on Self-Managed Azure Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, azure, kubernetes, self-managed, cni, networking

Description: Learn how to install and configure Calico on a self-managed Kubernetes cluster running on Azure VMs, providing full control over networking with Calico's complete feature set.

---

## Introduction

Running self-managed Kubernetes on Azure Virtual Machines lets you use Calico's full feature set without the constraints of AKS managed networking. You can configure Calico with its own IPAM, choose your encapsulation mode based on your VNet architecture, and leverage BGP peering with Azure's virtual network gateway.

Unlike AKS, self-managed Kubernetes on Azure gives you control over the control plane configuration, allowing you to set custom pod CIDRs, use Calico's multi-pool IPAM, and enable Calico Enterprise features that are not available in the managed AKS Calico integration.

This guide walks through setting up a self-managed Kubernetes cluster on Azure VMs with Calico as the CNI, with configuration tuned for the Azure networking environment.

## Prerequisites

- Azure VMs with Ubuntu 22.04 (1 control plane, 2+ workers) in the same VNet
- Azure Network Security Group configured to allow cluster traffic
- kubeadm, kubelet, and kubectl installed on all nodes
- Azure CLI available for NSG configuration

## Step 1: Prepare Azure VMs for Kubernetes

Configure the VMs and network before initializing the cluster.

```bash
# On all nodes — disable swap (required for Kubernetes)
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Load required kernel modules
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay
sudo modprobe br_netfilter

# Configure sysctl settings for Kubernetes networking
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system
```

## Step 2: Initialize the Kubernetes Cluster

Initialize the control plane with a non-overlapping pod CIDR.

```bash
# On the control plane node — get the private IP from Azure instance metadata
PRIVATE_IP=$(curl -s -H "Metadata:true" \
  "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/privateIpAddress?api-version=2021-02-01&format=text")

# Initialize kubeadm with Calico-compatible pod CIDR
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=$PRIVATE_IP

# Set up kubectl
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Step 3: Install Calico

Deploy Calico using the Tigera operator.

```bash
# Install the Tigera operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
```

```yaml
# calico-azure-installation.yaml
# Calico installation for self-managed Azure VMs
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - name: default-ipv4-ippool
      cidr: 192.168.0.0/16
      # VXLAN works well on Azure VNets without special routing configuration
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
```

```bash
# Apply the Calico installation
kubectl apply -f calico-azure-installation.yaml

# Wait for Calico to be ready
kubectl wait --for=condition=Available tigerastatus/calico --timeout=10m

# Join worker nodes using the token from kubeadm init
# On each worker node: sudo kubeadm join <control-plane>:6443 --token <token> ...
```

## Step 4: Configure Azure NSG for Calico

Add the required inbound rules to the Azure Network Security Group.

```bash
# Allow VXLAN UDP traffic between cluster nodes
az network nsg rule create \
  --resource-group my-rg \
  --nsg-name cluster-nsg \
  --name allow-calico-vxlan \
  --protocol Udp \
  --priority 1000 \
  --destination-port-range 4789 \
  --source-address-prefix VirtualNetwork \
  --destination-address-prefix VirtualNetwork \
  --access Allow

# Allow Calico Typha communication
az network nsg rule create \
  --resource-group my-rg \
  --nsg-name cluster-nsg \
  --name allow-calico-typha \
  --protocol Tcp \
  --priority 1001 \
  --destination-port-range 5473 \
  --source-address-prefix VirtualNetwork \
  --destination-address-prefix VirtualNetwork \
  --access Allow
```

## Step 5: Verify Calico and Apply First Policies

Confirm the installation and deploy your first network policies.

```bash
# Install calicoctl
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o calicoctl && chmod +x calicoctl && sudo mv calicoctl /usr/local/bin/

# Verify Calico node status
calicoctl node status

# Check IP pool is active
calicoctl get ippools -o wide

# Deploy a test workload
kubectl create namespace test
kubectl run nginx -n test --image=nginx
kubectl expose -n test pod nginx --port=80 --name=nginx-svc
kubectl run curl-test -n test --image=curlimages/curl --rm -it -- curl nginx-svc
```

## Best Practices

- Use VXLAN encapsulation on Azure to avoid needing to configure User Defined Routes for pod traffic
- Configure Azure Accelerated Networking on VM NICs to improve VXLAN performance
- Apply Azure NSG rules before joining nodes — Calico initialization requires network connectivity
- Use Azure Private DNS for in-cluster DNS instead of public DNS for better performance
- Back up kubeadm certificates and etcd regularly on self-managed clusters

## Conclusion

Self-managed Kubernetes on Azure with Calico provides complete networking flexibility that complements Azure's infrastructure. By using VXLAN encapsulation and configuring Azure NSG rules appropriately, you can run a production-grade Calico deployment on Azure VMs with all of Calico's advanced policy and IPAM features available without any managed service restrictions.
