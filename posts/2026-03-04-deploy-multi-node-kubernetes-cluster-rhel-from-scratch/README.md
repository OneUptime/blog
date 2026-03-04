# How to Deploy a Multi-Node Kubernetes Cluster on RHEL from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Cluster, High Availability, Linux

Description: Deploy a production-ready multi-node Kubernetes cluster on RHEL with multiple control plane nodes and workers for high availability.

---

A production Kubernetes cluster needs multiple control plane nodes for high availability and multiple workers for capacity. This guide walks through building a 3 control-plane, 3 worker cluster on RHEL.

## Cluster Architecture

```
Control Plane Nodes: cp1 (192.168.1.10), cp2 (192.168.1.11), cp3 (192.168.1.12)
Worker Nodes: w1 (192.168.1.20), w2 (192.168.1.21), w3 (192.168.1.22)
Load Balancer: lb (192.168.1.5) - HAProxy for API server
```

## Setting Up the Load Balancer

Install HAProxy on the load balancer node to distribute API server traffic:

```bash
# On the load balancer node
sudo dnf install haproxy -y

# Configure HAProxy for Kubernetes API server
sudo tee /etc/haproxy/haproxy.cfg << 'EOF'
global
    log /dev/log local0
    maxconn 4096

defaults
    mode tcp
    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend k8s-api
    bind *:6443
    default_backend k8s-api-backend

backend k8s-api-backend
    balance roundrobin
    option tcp-check
    server cp1 192.168.1.10:6443 check fall 3 rise 2
    server cp2 192.168.1.11:6443 check fall 3 rise 2
    server cp3 192.168.1.12:6443 check fall 3 rise 2
EOF

sudo systemctl enable --now haproxy
sudo firewall-cmd --permanent --add-port=6443/tcp
sudo firewall-cmd --reload
```

## Preparing All Nodes

Run this on all 6 nodes:

```bash
# Disable swap
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Kernel modules and sysctl
sudo tee /etc/modules-load.d/k8s.conf << 'EOF'
overlay
br_netfilter
EOF
sudo modprobe overlay && sudo modprobe br_netfilter

sudo tee /etc/sysctl.d/k8s.conf << 'EOF'
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

# Install containerd
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install containerd.io -y
sudo containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl enable --now containerd

# Install kubeadm, kubelet, kubectl
sudo tee /etc/yum.repos.d/kubernetes.repo << 'EOF'
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/repodata/repomd.xml.key
EOF
sudo dnf install -y kubelet kubeadm kubectl
sudo systemctl enable kubelet
```

## Initializing the First Control Plane Node

```bash
# On cp1: Initialize with the load balancer endpoint
sudo kubeadm init \
  --control-plane-endpoint "192.168.1.5:6443" \
  --upload-certs \
  --pod-network-cidr=10.244.0.0/16

# Set up kubectl
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install Calico CNI
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Joining Additional Control Plane Nodes

Use the control-plane join command from the init output:

```bash
# On cp2 and cp3
sudo kubeadm join 192.168.1.5:6443 \
  --token your-token \
  --discovery-token-ca-cert-hash sha256:your-hash \
  --control-plane --certificate-key your-cert-key
```

## Joining Worker Nodes

```bash
# On w1, w2, w3
sudo kubeadm join 192.168.1.5:6443 \
  --token your-token \
  --discovery-token-ca-cert-hash sha256:your-hash
```

## Verifying the Cluster

```bash
# All 6 nodes should show Ready
kubectl get nodes -o wide

# Verify etcd cluster health
kubectl -n kube-system exec -it etcd-cp1 -- \
  etcdctl member list --cacert /etc/kubernetes/pki/etcd/ca.crt \
  --cert /etc/kubernetes/pki/etcd/peer.crt \
  --key /etc/kubernetes/pki/etcd/peer.key
```

This gives you a highly available Kubernetes cluster where the loss of any single control plane node does not affect cluster operations.
