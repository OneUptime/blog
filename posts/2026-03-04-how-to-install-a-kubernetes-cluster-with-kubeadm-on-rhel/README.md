# How to Install a Kubernetes Cluster with kubeadm on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Kubeadm, Cluster, Container Orchestration

Description: Learn how to set up a Kubernetes cluster on RHEL using kubeadm with containerd as the container runtime.

---

kubeadm is the official Kubernetes tool for bootstrapping production-ready clusters. This guide covers setting up a control plane node and joining worker nodes on RHEL.

## Prerequisites (All Nodes)

```bash
# Disable swap (required by Kubernetes)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Disable SELinux (or set to permissive)
sudo setenforce 0
sudo sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config

# Load required kernel modules
cat << 'MODULES' | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
MODULES

sudo modprobe overlay
sudo modprobe br_netfilter

# Set sysctl parameters
cat << 'SYSCTL' | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
SYSCTL

sudo sysctl --system
```

## Installing containerd (All Nodes)

```bash
# Add Docker repository for containerd
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y containerd.io

# Configure containerd to use systemd cgroup driver
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

sudo systemctl enable --now containerd
```

## Installing kubeadm, kubelet, and kubectl (All Nodes)

```bash
# Add the Kubernetes repository
cat << 'REPO' | sudo tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/repodata/repomd.xml.key
REPO

# Install packages
sudo dnf install -y kubelet kubeadm kubectl
sudo systemctl enable kubelet
```

## Initializing the Control Plane

```bash
# On the control plane node only
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.1.100

# Set up kubectl for the current user
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Installing a Pod Network (Calico)

```bash
# Install Calico CNI
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

# Verify all pods are running
kubectl get pods -n kube-system
```

## Joining Worker Nodes

```bash
# On each worker node, run the join command from kubeadm init output
sudo kubeadm join 192.168.1.100:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>

# If the token expired, generate a new one on the control plane
kubeadm token create --print-join-command
```

## Firewall Configuration

```bash
# Control plane
sudo firewall-cmd --add-port=6443/tcp --permanent   # API server
sudo firewall-cmd --add-port=2379-2380/tcp --permanent  # etcd
sudo firewall-cmd --add-port=10250/tcp --permanent   # kubelet

# Worker nodes
sudo firewall-cmd --add-port=10250/tcp --permanent   # kubelet
sudo firewall-cmd --add-port=30000-32767/tcp --permanent  # NodePort

sudo firewall-cmd --reload
```

## Verifying the Cluster

```bash
kubectl get nodes
kubectl get pods -A
kubectl cluster-info
```

After all nodes show "Ready" status, deploy a test application to verify the cluster works end to end.
