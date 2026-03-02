# How to Set Up a Multi-Node Kubernetes Cluster on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, DevOps, Container, Cluster

Description: Step-by-step walkthrough for building a production-ready multi-node Kubernetes cluster on Ubuntu using kubeadm, covering installation, networking, and node joining.

---

Running a single-node Kubernetes cluster works fine for experimentation, but production workloads need the redundancy, resource distribution, and fault tolerance that come with multiple nodes. This tutorial walks through building a multi-node cluster from scratch on Ubuntu using kubeadm - the official cluster bootstrapping tool.

## Architecture Overview

A standard Kubernetes cluster has two node types:

- **Control plane (master)**: Runs the API server, scheduler, controller manager, and etcd. This is the brain of the cluster.
- **Worker nodes**: Run application workloads as pods. You can scale these horizontally.

For this tutorial, the setup assumes one control plane node and two worker nodes, all running Ubuntu 22.04 LTS.

### Hardware Requirements

| Node | CPU | RAM | Disk |
|------|-----|-----|------|
| Control plane | 2+ cores | 4+ GB | 30+ GB |
| Worker nodes | 2+ cores | 2+ GB | 20+ GB |

All nodes need static IP addresses and resolvable hostnames. Network connectivity between all nodes on ports 6443, 2379-2380, 10250, 10259, and 10257 is required.

## Prerequisites on All Nodes

Run these steps on every node before initializing the cluster.

### Disable Swap

Kubernetes requires swap to be disabled. The kubelet will refuse to start if swap is active.

```bash
# Disable swap immediately
sudo swapoff -a

# Comment out swap entries to persist across reboots
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Verify swap is off
free -h
```

### Set Hostnames

Give each node a meaningful hostname. Run on each respective node:

```bash
# On the control plane node
sudo hostnamectl set-hostname k8s-control

# On worker node 1
sudo hostnamectl set-hostname k8s-worker-1

# On worker node 2
sudo hostnamectl set-hostname k8s-worker-2
```

Update `/etc/hosts` on all nodes to include all cluster members:

```bash
sudo tee -a /etc/hosts <<EOF
192.168.1.10  k8s-control
192.168.1.11  k8s-worker-1
192.168.1.12  k8s-worker-2
EOF
```

### Load Kernel Modules

Kubernetes networking requires specific kernel modules:

```bash
# Load required modules
sudo tee /etc/modules-load.d/k8s.conf <<EOF
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# Verify modules are loaded
lsmod | grep -E 'overlay|br_netfilter'
```

### Configure Kernel Parameters

```bash
sudo tee /etc/sysctl.d/k8s.conf <<EOF
# Allow iptables to see bridged traffic
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
# Enable IP forwarding for pod routing
net.ipv4.ip_forward                 = 1
EOF

# Apply without rebooting
sudo sysctl --system
```

## Install Container Runtime (containerd)

Kubernetes needs a container runtime. containerd is the recommended choice.

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's GPG key (containerd is distributed via Docker's repos)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install containerd
sudo apt-get update
sudo apt-get install -y containerd.io
```

Configure containerd to use systemd as the cgroup driver:

```bash
# Generate default config
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Switch cgroup driver to systemd
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Restart and enable containerd
sudo systemctl restart containerd
sudo systemctl enable containerd
```

## Install kubeadm, kubelet, and kubectl

```bash
# Add Kubernetes apt repository
sudo curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
  https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

# Install the three components
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl

# Pin the versions to prevent unintended upgrades
sudo apt-mark hold kubelet kubeadm kubectl
```

## Initialize the Control Plane

Run this only on the control plane node:

```bash
# Initialize the cluster
# --pod-network-cidr is required for Flannel (adjust for your CNI)
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.1.10 \
  --control-plane-endpoint=k8s-control:6443
```

After completion, configure kubectl for your user:

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

Save the join command printed at the end of `kubeadm init` - you will need it for workers.

## Install a Pod Network Add-on

Without a CNI plugin, pods cannot communicate across nodes. Install Flannel:

```bash
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```

Wait for all system pods to reach Running state:

```bash
# Watch pod status until everything is Running
kubectl get pods -n kube-system --watch
```

## Join Worker Nodes

On each worker node, run the join command from the kubeadm init output. It looks like this:

```bash
# Run this on each worker node - your token and hash will differ
sudo kubeadm join k8s-control:6443 \
  --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash sha256:abc123...
```

If the token expires (they last 24 hours), generate a new one:

```bash
# On the control plane, generate a new join command
kubeadm token create --print-join-command
```

## Verify the Cluster

Back on the control plane, check that all nodes have joined:

```bash
# List all nodes and their status
kubectl get nodes -o wide

# Expected output
NAME           STATUS   ROLES           AGE   VERSION
k8s-control    Ready    control-plane   10m   v1.29.0
k8s-worker-1   Ready    <none>          5m    v1.29.0
k8s-worker-2   Ready    <none>          4m    v1.29.0
```

Deploy a test workload to verify scheduling across workers:

```bash
# Create a deployment with 3 replicas
kubectl create deployment nginx-test --image=nginx --replicas=3

# Check which nodes pods landed on
kubectl get pods -o wide

# Clean up
kubectl delete deployment nginx-test
```

## Label and Taint Nodes

Label worker nodes for workload targeting:

```bash
# Add role labels to worker nodes
kubectl label node k8s-worker-1 node-role.kubernetes.io/worker=worker
kubectl label node k8s-worker-2 node-role.kubernetes.io/worker=worker

# Add custom labels for node selection
kubectl label node k8s-worker-1 disktype=ssd
kubectl label node k8s-worker-2 disktype=hdd
```

## Monitoring the Cluster Health

Check component health regularly:

```bash
# Check control plane component status
kubectl get componentstatuses

# Check system pod health
kubectl get pods -n kube-system

# View node resource usage (requires metrics-server)
kubectl top nodes
```

## Common Issues and Fixes

**Nodes stuck in NotReady**: Usually a CNI issue. Check flannel pods with `kubectl get pods -n kube-flannel`.

**Port already in use during init**: Run `sudo kubeadm reset` before re-initializing.

**Token expired for joining**: Regenerate with `kubeadm token create --print-join-command` on the control plane.

**Cgroup driver mismatch**: Ensure both containerd and kubelet use `systemd`. Check `/etc/containerd/config.toml` and the kubelet configuration.

A working multi-node cluster is the foundation for everything else - namespaces, RBAC, storage classes, and production deployments all build on top of a healthy node pool.
