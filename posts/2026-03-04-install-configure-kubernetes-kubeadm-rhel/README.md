# How to Install and Configure Kubernetes (kubeadm) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Kubeadm, Containers, Linux

Description: Install Kubernetes on RHEL using kubeadm, including prerequisites, cluster initialization, and worker node setup.

---

kubeadm is the official Kubernetes tool for bootstrapping clusters. Here is how to install and configure a Kubernetes cluster on RHEL from scratch.

## Prerequisites on All Nodes

Disable swap and configure kernel modules on every node (control plane and workers):

```bash
# Disable swap (required for Kubernetes)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Load required kernel modules
sudo tee /etc/modules-load.d/k8s.conf << 'EOF'
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# Set required sysctl parameters
sudo tee /etc/sysctl.d/k8s.conf << 'EOF'
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

## Installing containerd

```bash
# Install containerd as the container runtime
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install containerd.io -y

# Generate the default containerd configuration
sudo containerd config default | sudo tee /etc/containerd/config.toml

# Enable SystemdCgroup (required for kubeadm)
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Start containerd
sudo systemctl enable --now containerd
```

## Installing kubeadm, kubelet, and kubectl

```bash
# Add the Kubernetes repository
sudo tee /etc/yum.repos.d/kubernetes.repo << 'EOF'
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/repodata/repomd.xml.key
EOF

# Install Kubernetes components
sudo dnf install -y kubelet kubeadm kubectl
sudo systemctl enable kubelet
```

## Firewall Configuration

```bash
# On the control plane node
sudo firewall-cmd --permanent --add-port=6443/tcp      # API server
sudo firewall-cmd --permanent --add-port=2379-2380/tcp  # etcd
sudo firewall-cmd --permanent --add-port=10250/tcp      # kubelet
sudo firewall-cmd --permanent --add-port=10259/tcp      # kube-scheduler
sudo firewall-cmd --permanent --add-port=10257/tcp      # kube-controller-manager
sudo firewall-cmd --reload

# On worker nodes
sudo firewall-cmd --permanent --add-port=10250/tcp      # kubelet
sudo firewall-cmd --permanent --add-port=30000-32767/tcp # NodePort services
sudo firewall-cmd --reload
```

## Initializing the Control Plane

```bash
# Initialize the cluster on the control plane node
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.1.10

# Set up kubectl access for your user
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Save the join command from the output for worker nodes
```

## Installing a Pod Network (Flannel)

```bash
# Install Flannel CNI
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Wait for all pods to be ready
kubectl get pods -n kube-flannel -w
```

## Joining Worker Nodes

Run the join command from the init output on each worker:

```bash
# On each worker node
sudo kubeadm join 192.168.1.10:6443 \
  --token your-token \
  --discovery-token-ca-cert-hash sha256:your-hash
```

## Verifying the Cluster

```bash
# On the control plane, check all nodes are Ready
kubectl get nodes

# Verify system pods are running
kubectl get pods -n kube-system
```

Your Kubernetes cluster on RHEL is now ready for workloads.
