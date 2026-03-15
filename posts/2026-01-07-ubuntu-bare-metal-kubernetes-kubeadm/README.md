# How to Set Up a Bare-Metal Kubernetes Cluster on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Kubernetes, kubeadm, Bare Metal, DevOps

Description: Set up a production-ready bare-metal Kubernetes cluster on Ubuntu using kubeadm with CNI networking, storage, and high availability.

---

Running Kubernetes on bare metal gives you complete control over your infrastructure, better performance, and lower costs compared to cloud-managed solutions. This guide walks you through setting up a production-ready Kubernetes cluster on Ubuntu servers using kubeadm, the official Kubernetes bootstrapping tool.

## Prerequisites

Before you begin, ensure you have the following:

### Hardware Requirements

| Role | Minimum CPU | Minimum RAM | Minimum Disk |
|------|-------------|-------------|--------------|
| Control Plane | 2 cores | 2 GB | 50 GB |
| Worker Node | 2 cores | 2 GB | 50 GB |

### Software Requirements

- Ubuntu 22.04 LTS or Ubuntu 24.04 LTS on all nodes
- Root or sudo access on all nodes
- Static IP addresses configured on all nodes
- Unique hostname, MAC address, and product_uuid for every node
- Network connectivity between all nodes

### Network Requirements

Ensure the following ports are open:

**Control Plane Nodes:**
| Port | Protocol | Purpose |
|------|----------|---------|
| 6443 | TCP | Kubernetes API server |
| 2379-2380 | TCP | etcd server client API |
| 10250 | TCP | Kubelet API |
| 10259 | TCP | kube-scheduler |
| 10257 | TCP | kube-controller-manager |

**Worker Nodes:**
| Port | Protocol | Purpose |
|------|----------|---------|
| 10250 | TCP | Kubelet API |
| 10256 | TCP | kube-proxy |
| 30000-32767 | TCP | NodePort Services |

### Example Cluster Setup

For this guide, we'll use the following three-node cluster:

| Hostname | IP Address | Role |
|----------|------------|------|
| k8s-master | 192.168.1.100 | Control Plane |
| k8s-worker1 | 192.168.1.101 | Worker |
| k8s-worker2 | 192.168.1.102 | Worker |

## Step 1: Prepare All Nodes

Perform the following steps on **all nodes** (control plane and workers).

### Update the System

First, update your system packages and install necessary dependencies.

```bash
# Update package lists and upgrade installed packages
sudo apt update && sudo apt upgrade -y

# Install required packages for Kubernetes installation
sudo apt install -y apt-transport-https ca-certificates curl gpg software-properties-common
```

### Set Hostnames

Configure unique hostnames on each node to ensure proper cluster identification.

```bash
# On the control plane node
sudo hostnamectl set-hostname k8s-master

# On worker node 1
sudo hostnamectl set-hostname k8s-worker1

# On worker node 2
sudo hostnamectl set-hostname k8s-worker2
```

### Configure /etc/hosts

Add all cluster nodes to the hosts file for internal DNS resolution.

```bash
# Add these entries to /etc/hosts on all nodes
cat <<EOF | sudo tee -a /etc/hosts
192.168.1.100 k8s-master
192.168.1.101 k8s-worker1
192.168.1.102 k8s-worker2
EOF
```

### Disable Swap

Kubernetes requires swap to be disabled for proper memory management.

```bash
# Disable swap immediately
sudo swapoff -a

# Disable swap permanently by commenting out swap entries in /etc/fstab
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Verify swap is disabled
free -h
```

### Load Required Kernel Modules

Load the kernel modules required for container networking.

```bash
# Create configuration file for persistent module loading
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

# Load the modules immediately
sudo modprobe overlay
sudo modprobe br_netfilter

# Verify modules are loaded
lsmod | grep -E "overlay|br_netfilter"
```

### Configure Kernel Parameters

Set the required sysctl parameters for Kubernetes networking.

```bash
# Create sysctl configuration for Kubernetes
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Apply sysctl parameters without reboot
sudo sysctl --system

# Verify the settings
sysctl net.bridge.bridge-nf-call-iptables net.bridge.bridge-nf-call-ip6tables net.ipv4.ip_forward
```

### Configure Firewall (Optional)

If you're using UFW, configure the firewall rules.

```bash
# On the control plane node
sudo ufw allow 6443/tcp      # Kubernetes API server
sudo ufw allow 2379:2380/tcp # etcd
sudo ufw allow 10250/tcp     # Kubelet API
sudo ufw allow 10259/tcp     # kube-scheduler
sudo ufw allow 10257/tcp     # kube-controller-manager

# On worker nodes
sudo ufw allow 10250/tcp        # Kubelet API
sudo ufw allow 10256/tcp        # kube-proxy
sudo ufw allow 30000:32767/tcp  # NodePort Services

# Reload firewall
sudo ufw reload
```

## Step 2: Install Container Runtime (containerd)

Kubernetes requires a container runtime to run containers. We'll use containerd, the industry-standard container runtime.

### Install containerd

Install containerd from the official Docker repository for the latest stable version.

```bash
# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository to apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package lists and install containerd
sudo apt update
sudo apt install -y containerd.io
```

### Configure containerd

Generate the default configuration and enable SystemdCgroup for proper cgroup management.

```bash
# Create the containerd configuration directory
sudo mkdir -p /etc/containerd

# Generate the default configuration file
sudo containerd config default | sudo tee /etc/containerd/config.toml > /dev/null

# Enable SystemdCgroup (required for Kubernetes)
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

# Restart containerd to apply changes
sudo systemctl restart containerd

# Enable containerd to start on boot
sudo systemctl enable containerd

# Verify containerd is running
sudo systemctl status containerd
```

### Verify containerd Installation

Test that containerd is working correctly.

```bash
# Check containerd version
containerd --version

# Verify the runtime is accessible
sudo ctr version
```

## Step 3: Install Kubernetes Components

Install kubeadm, kubelet, and kubectl on all nodes.

### Add Kubernetes Repository

Add the official Kubernetes apt repository.

```bash
# Create the keyrings directory if it doesn't exist
sudo mkdir -p /etc/apt/keyrings

# Download the Kubernetes signing key
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# Add the Kubernetes repository
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
```

### Install kubeadm, kubelet, and kubectl

Install the Kubernetes components and hold their versions to prevent accidental upgrades.

```bash
# Update package lists
sudo apt update

# Install Kubernetes components
sudo apt install -y kubelet kubeadm kubectl

# Hold the packages at current version to prevent automatic updates
sudo apt-mark hold kubelet kubeadm kubectl

# Verify installation
kubeadm version
kubectl version --client
kubelet --version
```

### Enable kubelet Service

Enable the kubelet service to start automatically on boot.

```bash
# Enable kubelet (it will start automatically after kubeadm init)
sudo systemctl enable kubelet
```

## Step 4: Initialize the Control Plane

Perform the following steps only on the **control plane node** (k8s-master).

### Pre-pull Container Images

Download the required container images before initialization to speed up the process.

```bash
# Pull all required container images
sudo kubeadm config images pull

# List the pulled images
sudo crictl images
```

### Initialize the Cluster

Initialize the Kubernetes control plane with the appropriate configuration.

```bash
# Initialize the control plane
# --pod-network-cidr: CIDR range for pod IPs (required for CNI plugins)
# --apiserver-advertise-address: IP address the API server will advertise
# --control-plane-endpoint: Endpoint for the control plane (use for HA setups)
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.1.100 \
  --control-plane-endpoint=k8s-master:6443
```

If the initialization is successful, you'll see output containing:
- A message confirming the control plane has been initialized
- Instructions for setting up kubectl
- A `kubeadm join` command for adding worker nodes

### Save the Join Command

Copy and save the `kubeadm join` command from the output. It will look similar to:

```bash
# Example join command (your token and hash will be different)
kubeadm join k8s-master:6443 --token abcdef.0123456789abcdef \
    --discovery-token-ca-cert-hash sha256:1234567890abcdef...
```

### Configure kubectl for the Admin User

Set up kubectl to communicate with the cluster.

```bash
# Create the .kube directory in your home folder
mkdir -p $HOME/.kube

# Copy the admin kubeconfig file
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

# Set the correct ownership
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Verify kubectl is working
kubectl cluster-info
```

### Verify Control Plane Status

Check the status of the control plane components.

```bash
# Check cluster info
kubectl cluster-info

# View all nodes (master will show NotReady until CNI is installed)
kubectl get nodes

# Check the status of system pods
kubectl get pods -n kube-system
```

## Step 5: Install CNI Network Plugin

A CNI (Container Network Interface) plugin is required for pod networking. We'll cover two popular options: Calico and Cilium.

### Option A: Install Calico

Calico is a widely-used CNI plugin that provides networking and network policy.

```bash
# Download the Calico manifest
curl https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml -O

# Apply the Calico manifest
kubectl apply -f calico.yaml

# Watch the Calico pods come up
kubectl get pods -n kube-system -l k8s-app=calico-node -w
```

### Option B: Install Cilium

Cilium is an advanced CNI plugin that uses eBPF for networking and security.

```bash
# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz

# Install Cilium on the cluster
cilium install

# Verify Cilium installation
cilium status --wait
```

### Verify CNI Installation

After installing your chosen CNI plugin, verify the installation.

```bash
# Check that all pods are running
kubectl get pods -n kube-system

# Verify the node is now Ready
kubectl get nodes

# Expected output:
# NAME         STATUS   ROLES           AGE   VERSION
# k8s-master   Ready    control-plane   10m   v1.31.x
```

## Step 6: Join Worker Nodes

Perform the following steps on each **worker node**.

### Join the Cluster

Use the join command saved from the control plane initialization.

```bash
# Run this on each worker node
# Replace the token and hash with your actual values
sudo kubeadm join k8s-master:6443 --token abcdef.0123456789abcdef \
    --discovery-token-ca-cert-hash sha256:1234567890abcdef...
```

### Generate a New Join Token (If Expired)

If the original token has expired, generate a new one on the control plane.

```bash
# Run this on the control plane node
# Create a new token and print the full join command
kubeadm token create --print-join-command
```

### Verify Worker Nodes Joined

On the control plane, verify all nodes have joined successfully.

```bash
# Check all nodes in the cluster
kubectl get nodes

# Expected output:
# NAME          STATUS   ROLES           AGE   VERSION
# k8s-master    Ready    control-plane   15m   v1.31.x
# k8s-worker1   Ready    <none>          5m    v1.31.x
# k8s-worker2   Ready    <none>          3m    v1.31.x
```

### Label Worker Nodes (Optional)

Add labels to worker nodes for better organization.

```bash
# Label nodes with the worker role
kubectl label node k8s-worker1 node-role.kubernetes.io/worker=worker
kubectl label node k8s-worker2 node-role.kubernetes.io/worker=worker

# Verify labels
kubectl get nodes

# Expected output:
# NAME          STATUS   ROLES           AGE   VERSION
# k8s-master    Ready    control-plane   15m   v1.31.x
# k8s-worker1   Ready    worker          5m    v1.31.x
# k8s-worker2   Ready    worker          3m    v1.31.x
```

## Step 7: Basic Cluster Validation

Validate your cluster is working correctly by deploying test workloads.

### Test Pod Deployment

Deploy a simple nginx pod to test the cluster.

```bash
# Create a test deployment
kubectl create deployment nginx-test --image=nginx --replicas=3

# Check deployment status
kubectl get deployment nginx-test

# Check pods are distributed across nodes
kubectl get pods -o wide

# Expected output showing pods on different nodes:
# NAME                          READY   STATUS    NODE
# nginx-test-xxx-xxx            1/1     Running   k8s-worker1
# nginx-test-xxx-yyy            1/1     Running   k8s-worker2
# nginx-test-xxx-zzz            1/1     Running   k8s-worker1
```

### Test Service and Networking

Expose the deployment and test internal networking.

```bash
# Expose the deployment as a ClusterIP service
kubectl expose deployment nginx-test --port=80 --type=ClusterIP

# Get the service details
kubectl get svc nginx-test

# Test the service from inside the cluster
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- curl nginx-test

# You should see the nginx welcome page HTML
```

### Test NodePort Service

Test external access using a NodePort service.

```bash
# Expose the deployment as a NodePort service
kubectl expose deployment nginx-test --port=80 --type=NodePort --name=nginx-nodeport

# Get the NodePort
kubectl get svc nginx-nodeport

# Output will show something like:
# NAME            TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
# nginx-nodeport  NodePort   10.96.x.x      <none>        80:31234/TCP   10s

# Test access from outside the cluster using any node IP
curl http://192.168.1.101:31234
```

### Test DNS Resolution

Verify CoreDNS is working correctly.

```bash
# Deploy a test pod with DNS tools
kubectl run dns-test --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default

# Expected output:
# Server:    10.96.0.10
# Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local
#
# Name:      kubernetes.default
# Address 1: 10.96.0.1 kubernetes.default.svc.cluster.local
```

### Run Cluster Diagnostics

Check overall cluster health.

```bash
# View all pods in all namespaces
kubectl get pods -A

# Check component status
kubectl get componentstatuses

# Check node resource usage
kubectl top nodes

# Note: kubectl top requires metrics-server to be installed
```

### Clean Up Test Resources

Remove the test deployments after validation.

```bash
# Delete test resources
kubectl delete deployment nginx-test
kubectl delete svc nginx-test nginx-nodeport
```

## Step 8: Install Essential Add-ons

Install commonly needed cluster add-ons.

### Install Metrics Server

The Metrics Server provides resource usage metrics for nodes and pods.

```bash
# Download the metrics server manifest
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# For bare-metal clusters, you may need to add --kubelet-insecure-tls flag
# Edit the deployment to add the flag
kubectl -n kube-system patch deployment metrics-server --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--kubelet-insecure-tls"
  }
]'

# Verify metrics server is running
kubectl get pods -n kube-system -l k8s-app=metrics-server

# Test metrics (wait a minute for metrics to be collected)
kubectl top nodes
kubectl top pods -A
```

### Install Kubernetes Dashboard (Optional)

Deploy the Kubernetes Dashboard for a web-based UI.

```bash
# Install the dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Create an admin user for the dashboard
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF

# Get the access token
kubectl -n kubernetes-dashboard create token admin-user

# Access the dashboard using kubectl proxy
kubectl proxy

# Open: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

## Troubleshooting Common Issues

### Node Shows NotReady Status

Check the kubelet logs and ensure the CNI plugin is installed.

```bash
# Check kubelet status
sudo systemctl status kubelet

# View kubelet logs
sudo journalctl -u kubelet -f

# Check if CNI is installed
ls /etc/cni/net.d/
```

### Pods Stuck in Pending State

Check if there are resource constraints or scheduling issues.

```bash
# Describe the pod to see events
kubectl describe pod <pod-name>

# Check node resources
kubectl describe nodes | grep -A5 "Allocated resources"
```

### Container Runtime Errors

Verify containerd is running correctly.

```bash
# Check containerd status
sudo systemctl status containerd

# View containerd logs
sudo journalctl -u containerd -f

# Test container runtime
sudo crictl info
```

### Reset and Start Over

If you need to reset a node and start fresh.

```bash
# Reset kubeadm on the node
sudo kubeadm reset -f

# Clean up iptables rules
sudo iptables -F && sudo iptables -t nat -F && sudo iptables -t mangle -F && sudo iptables -X

# Clean up CNI configuration
sudo rm -rf /etc/cni/net.d/*

# Remove kubernetes directories
sudo rm -rf /var/lib/kubelet/*
sudo rm -rf $HOME/.kube/config
```

## Security Best Practices

After setting up your cluster, consider implementing these security measures:

### Enable RBAC

RBAC is enabled by default in modern Kubernetes versions. Create appropriate roles for users.

```bash
# Example: Create a read-only role for a namespace
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
EOF
```

### Enable Pod Security Standards

Apply pod security standards to namespaces.

```bash
# Label a namespace to enforce restricted pod security
kubectl label namespace default pod-security.kubernetes.io/enforce=restricted
kubectl label namespace default pod-security.kubernetes.io/warn=restricted
```

### Rotate Certificates

Kubernetes certificates should be rotated regularly.

```bash
# Check certificate expiration
kubeadm certs check-expiration

# Renew all certificates
sudo kubeadm certs renew all

# Restart control plane components after renewal
sudo systemctl restart kubelet
```

## Conclusion

You now have a production-ready bare-metal Kubernetes cluster running on Ubuntu. Your cluster includes:

- A control plane node managing the cluster
- Multiple worker nodes for running workloads
- CNI networking for pod communication
- Essential add-ons like Metrics Server

From here, you can:
- Deploy your applications using Deployments, StatefulSets, and DaemonSets
- Set up Ingress controllers for external traffic routing
- Configure persistent storage with CSI drivers
- Implement monitoring with Prometheus and Grafana
- Set up GitOps workflows with ArgoCD or Flux

Remember to regularly update your cluster components, monitor resource usage, and follow Kubernetes security best practices to maintain a healthy and secure cluster.
