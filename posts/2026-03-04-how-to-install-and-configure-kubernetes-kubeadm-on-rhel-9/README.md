# How to Install and Configure Kubernetes (kubeadm) on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Kubernetes

Description: Step-by-step guide on install and configure kubernetes (kubeadm) on rhel 9 with practical examples and commands.

---

kubeadm is the standard tool for bootstrapping Kubernetes clusters on RHEL 9. This guide covers a complete installation.

## Prerequisites

Disable swap and configure kernel modules:

```bash
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab

sudo tee /etc/modules-load.d/k8s.conf <<EOF
overlay
br_netfilter
EOF
sudo modprobe overlay
sudo modprobe br_netfilter

sudo tee /etc/sysctl.d/k8s.conf <<EOF
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
sudo sysctl --system
```

## Install Container Runtime (containerd)

```bash
sudo dnf install -y containerd.io
sudo containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl enable --now containerd
```

## Install Kubernetes Components

```bash
sudo tee /etc/yum.repos.d/kubernetes.repo <<EOF
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

## Initialize the Cluster

```bash
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Install a CNI Plugin

```bash
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```

## Join Worker Nodes

Run the join command from kubeadm init output on each worker:

```bash
sudo kubeadm join 10.0.1.10:6443 --token xxx --discovery-token-ca-cert-hash sha256:xxx
```

## Verify

```bash
kubectl get nodes
kubectl get pods -A
```

## Conclusion

kubeadm on RHEL 9 provides a production-ready Kubernetes cluster. Add worker nodes, install a CNI plugin, and deploy your workloads using standard Kubernetes manifests.

