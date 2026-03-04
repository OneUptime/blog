# How to Install a Kubernetes Cluster with kubeadm on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Containers, kubeadm, Linux

Description: Learn how to install a Kubernetes Cluster with kubeadm on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

kubeadm is the official tool for bootstrapping production-grade Kubernetes clusters. This guide covers setting up a complete cluster with one control plane node and worker nodes on RHEL 9.

## Prerequisites

- At least two RHEL 9 servers (1 control plane, 1+ workers)
- 2 CPU cores and 2 GB RAM minimum per node
- Network connectivity between nodes
- Root or sudo access

## Step 1: Prepare All Nodes

On every node:

```bash
# Disable swap
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab

# Load required kernel modules
cat << EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# Set sysctl parameters
cat << EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

## Step 2: Install containerd

```bash
sudo dnf install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl enable --now containerd
```

## Step 3: Install kubeadm, kubelet, and kubectl

```bash
cat << EOF | sudo tee /etc/yum.repos.d/kubernetes.repo
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

## Step 4: Initialize the Control Plane

On the control plane node:

```bash
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
```

Save the join command from the output.

## Step 5: Configure kubectl

```bash
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Step 6: Install a CNI Plugin

Install Calico:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Step 7: Join Worker Nodes

On each worker node, run the join command from Step 4:

```bash
sudo kubeadm join <control-plane-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

## Step 8: Verify the Cluster

```bash
kubectl get nodes
kubectl get pods -A
```

All nodes should show `Ready` status.

## Conclusion

kubeadm on RHEL 9 provides a standardized way to bootstrap Kubernetes clusters suitable for production use. With containerd as the container runtime and Calico for networking, this setup provides a solid foundation for running containerized workloads.
