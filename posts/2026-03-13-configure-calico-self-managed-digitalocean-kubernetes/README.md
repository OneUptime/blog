# Configure Calico on Self-Managed DigitalOcean Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, DigitalOcean, Self-Managed

Description: A guide to deploying Calico on a self-managed Kubernetes cluster on DigitalOcean Droplets, providing advanced networking and policy capabilities beyond DOKS's managed options.

---

## Introduction

DigitalOcean Kubernetes Service (DOKS) uses Cilium as its default CNI. However, if you need Calico's specific feature set or are running self-managed Kubernetes on DigitalOcean Droplets (rather than DOKS), you can install Calico as the CNI for full control over your networking stack.

DigitalOcean's VPC networking provides a flat Layer 3 network between Droplets, making VXLAN or IP-in-IP encapsulation the most straightforward approach for pod-to-pod traffic. DigitalOcean also supports Cloud Firewalls, which complement Calico's network policy enforcement.

This guide covers setting up self-managed Kubernetes on DigitalOcean Droplets with Calico as the CNI.

## Prerequisites

- DigitalOcean Droplets with Ubuntu 22.04 (1 control plane, 2+ workers) in the same VPC
- DigitalOcean CLI (`doctl`) installed and authenticated
- kubeadm, kubelet, and kubectl installed on all Droplets
- `calicoctl` CLI available

## Step 1: Prepare Droplets for Kubernetes

Configure all Droplets before cluster initialization.

```bash
# On all nodes - perform prerequisite setup
# Disable swap
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Load kernel modules for Kubernetes networking
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay && sudo modprobe br_netfilter

# Configure sysctl for Kubernetes
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

# Install containerd, kubelet, kubeadm, kubectl (use your preferred method)
```

## Step 2: Configure DigitalOcean Cloud Firewall

Allow the ports required for Kubernetes and Calico.

```bash
# Create a firewall for the Kubernetes cluster
doctl compute firewall create \
  --name k8s-cluster-firewall \
  --inbound-rules "protocol:tcp,ports:6443,sources:tag:k8s-cluster" \
  --inbound-rules "protocol:tcp,ports:2379-2380,sources:tag:k8s-cluster" \
  --inbound-rules "protocol:tcp,ports:10250-10259,sources:tag:k8s-cluster" \
  --inbound-rules "protocol:udp,ports:4789,sources:tag:k8s-cluster" \
  --inbound-rules "protocol:tcp,ports:5473,sources:tag:k8s-cluster" \
  --outbound-rules "protocol:tcp,ports:all,destinations:address:0.0.0.0/0" \
  --outbound-rules "protocol:udp,ports:all,destinations:address:0.0.0.0/0"

# Tag all cluster Droplets
doctl compute droplet tag k8s-control-plane k8s-worker-1 k8s-worker-2 \
  --tag-name k8s-cluster
```

## Step 3: Initialize the Kubernetes Cluster

Bootstrap the control plane.

```bash
# On the control plane Droplet - get the private IP (DigitalOcean private network)
PRIVATE_IP=$(ip -4 addr show eth1 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')

# Initialize kubeadm with the private IP and a non-overlapping pod CIDR
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=$PRIVATE_IP

# Set up kubectl
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Step 4: Install Calico

Deploy Calico configured for DigitalOcean's networking.

```bash
# Install the Tigera operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
```

```yaml
# calico-do-installation.yaml
# Calico installation for DigitalOcean Droplets
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - name: default-ipv4-ippool
      cidr: 192.168.0.0/16
      # VXLAN works on DigitalOcean VPC without routing changes
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
```

```bash
# Apply the Calico installation
kubectl apply -f calico-do-installation.yaml

# Wait for Calico to be fully ready
kubectl wait --for=condition=Available tigerastatus/calico --timeout=10m

# Join worker nodes using the kubeadm join command from Step 3
# Verify all nodes are Ready
kubectl get nodes
```

## Step 5: Verify Installation and Apply Policies

Confirm Calico is healthy and apply test policies.

```bash
# Verify Calico status
calicoctl node status
calicoctl get ippools -o wide

# Deploy a test workload and verify connectivity
kubectl create namespace demo
kubectl run web --image=nginx -n demo
kubectl run client --image=curlimages/curl -n demo -- sleep 3600

# Test pod-to-pod connectivity (should work without policy)
WEB_IP=$(kubectl get pod web -n demo -o jsonpath='{.status.podIP}')
kubectl exec -n demo client -- curl -s http://$WEB_IP
```

## Best Practices

- Use DigitalOcean's private network (eth1) for all Kubernetes traffic - never use the public IP for inter-node communication
- Combine DigitalOcean Cloud Firewalls with Calico NetworkPolicy for defense-in-depth
- Use VXLAN encapsulation - DigitalOcean's VPC does not support user-managed routes needed for BGP mode
- Enable DigitalOcean Spaces for storing cluster backups (etcd snapshots)
- Monitor node resources carefully on DigitalOcean Droplets - Calico consumes additional CPU and memory

## Conclusion

Running self-managed Kubernetes on DigitalOcean Droplets with Calico provides a cost-effective, full-featured networking stack. With VXLAN encapsulation, DigitalOcean Cloud Firewalls for node-level protection, and Calico's rich policy engine for pod-level security, you get a production-capable platform that gives you full control over your networking configuration without the limitations of DOKS.
