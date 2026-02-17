# How to Set Up AKS Mariner (Azure Linux) Node Pools for Reduced Attack Surface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Azure Linux, Mariner, Security, Node Pools, Kubernetes, Container Host

Description: Learn how to create AKS node pools using Azure Linux (CBL-Mariner) for a minimal, security-hardened container host with reduced attack surface.

---

Most AKS clusters run Ubuntu as the node operating system. Ubuntu is a solid general-purpose Linux distribution, but it comes with a lot of packages and services that a Kubernetes node does not need. Every extra package is a potential attack vector, and every unnecessary service is something that could have a vulnerability.

Azure Linux (formerly CBL-Mariner) is Microsoft's container-optimized Linux distribution designed specifically for hosting container workloads. It includes only the packages needed to run Kubernetes and containers, resulting in a significantly smaller attack surface. This guide covers setting up Azure Linux node pools on AKS and what to expect when you make the switch.

## What Is Azure Linux (CBL-Mariner)

CBL-Mariner stands for Common Base Linux - Mariner. It is Microsoft's internal Linux distribution that has been used in production across Azure services for years. It is not a fork of Ubuntu or Debian - it is built from scratch with a focus on:

- **Minimal package set**: Only includes what is needed for container hosting
- **Small image size**: Roughly 30-40% smaller than the Ubuntu node image
- **Fast boot time**: Less to initialize means nodes come up faster
- **Security hardening**: Fewer packages means fewer CVEs to patch
- **Rapid patching**: Microsoft controls the full supply chain and can push security patches quickly

In practice, this means your nodes have fewer installed packages, fewer running services, and a smaller attack surface compared to Ubuntu-based nodes.

## Prerequisites

- Azure CLI 2.50 or later
- An existing AKS cluster (or create a new one)
- Understanding that Azure Linux is the node OS, not the container runtime - your application containers are unaffected

## Step 1: Create a New AKS Cluster with Azure Linux

To create a brand new cluster with Azure Linux as the default OS:

```bash
# Create an AKS cluster with Azure Linux (Mariner) as the node OS
az aks create \
  --resource-group myResourceGroup \
  --name myAzureLinuxCluster \
  --os-sku AzureLinux \
  --node-count 3 \
  --generate-ssh-keys
```

The `--os-sku AzureLinux` flag selects the Azure Linux image instead of Ubuntu.

## Step 2: Add an Azure Linux Node Pool to an Existing Cluster

If you have an existing cluster running Ubuntu and want to try Azure Linux, add a new node pool:

```bash
# Add an Azure Linux node pool to an existing cluster
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name azlinuxpool \
  --os-sku AzureLinux \
  --node-count 3 \
  --node-vm-size Standard_D4s_v5
```

You can run Ubuntu and Azure Linux node pools side by side in the same cluster. This is a great way to migrate gradually.

## Step 3: Verify the Node OS

Check that the nodes are running Azure Linux:

```bash
# Get node details showing the OS
kubectl get nodes -o wide

# Check the OS image on a specific node
kubectl get node <node-name> -o jsonpath='{.status.nodeInfo.osImage}'
# Expected: CBL-Mariner/Linux or Azure Linux

# Check the kernel version
kubectl get node <node-name> -o jsonpath='{.status.nodeInfo.kernelVersion}'
```

You can also inspect the node directly:

```bash
# Debug into a node to see the OS details
kubectl debug node/<node-name> -it --image=busybox
chroot /host

# Check OS release info
cat /etc/os-release

# Compare installed packages (Azure Linux has far fewer)
rpm -qa | wc -l
# Typically 200-300 packages vs 600+ on Ubuntu
```

## Step 4: Migrate Workloads from Ubuntu to Azure Linux

To migrate workloads from Ubuntu node pools to Azure Linux node pools, use node selectors or gradually shift traffic.

### Using Node Labels

Azure Linux nodes have a specific label you can use for scheduling:

```bash
# Check labels on Azure Linux nodes
kubectl get nodes --show-labels | grep azlinuxpool
```

Schedule workloads specifically on Azure Linux:

```yaml
# deployment-azurelinux.yaml
# Deploy to Azure Linux nodes using the agentpool label
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Target Azure Linux node pool
      nodeSelector:
        agentpool: azlinuxpool
      containers:
      - name: my-app
        image: myregistry.azurecr.io/my-app:v1
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
```

### Gradual Migration Strategy

Here is a safe migration approach:

```bash
# Step 1: Create the Azure Linux node pool
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name azlinuxpool \
  --os-sku AzureLinux \
  --node-count 3

# Step 2: Cordon the old Ubuntu pool (prevent new pods from scheduling)
kubectl cordon -l agentpool=ubuntupool

# Step 3: Drain the old pool (move existing pods to Azure Linux nodes)
kubectl drain -l agentpool=ubuntupool \
  --ignore-daemonsets \
  --delete-emptydir-data

# Step 4: Verify all workloads are running on Azure Linux nodes
kubectl get pods -o wide --all-namespaces | grep azlinuxpool

# Step 5: Delete the old Ubuntu node pool
az aks nodepool delete \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name ubuntupool
```

## Step 5: Understanding Package Management

Azure Linux uses RPM packages (via `tdnf`, the Tiny DNF package manager) instead of APT/DPKG. If you need to install additional packages on nodes for debugging:

```bash
# Inside a node debug session
kubectl debug node/<node-name> -it --image=busybox
chroot /host

# List installed packages
tdnf list installed

# Search for a package
tdnf search tcpdump

# Install a package (for temporary debugging only)
tdnf install -y tcpdump
```

For production, you should never install additional packages directly on nodes. Use purpose-built debug containers or DaemonSets with the tools you need.

## Step 6: Security Comparison

Let us look at the concrete security differences between Ubuntu and Azure Linux nodes.

### Installed Packages

```bash
# On an Azure Linux node
rpm -qa | wc -l
# Typical output: ~250 packages

# On an Ubuntu node (for comparison)
# dpkg -l | wc -l
# Typical output: ~600+ packages
```

Fewer packages means:
- Fewer CVEs that affect your nodes
- Faster security scanning
- Less surface area for attackers

### Running Services

```bash
# Check running services on Azure Linux
systemctl list-units --type=service --state=running

# Typical output: 15-20 services vs 30+ on Ubuntu
```

Azure Linux runs only the essential services: kubelet, containerd, systemd-networkd, and a handful of system services. Ubuntu includes many additional services that are not needed for container hosting.

### Kernel Hardening

Azure Linux uses a hardened kernel configuration with:
- Restricted kernel module loading
- Kernel address space layout randomization (KASLR)
- Stack protector enabled
- Restricted dmesg access for non-root users

## Step 7: Configure Automatic OS Updates

Azure Linux nodes receive security updates through the AKS node image upgrade mechanism.

```bash
# Check the current node image version
az aks nodepool show \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name azlinuxpool \
  --query nodeImageVersion -o tsv

# Enable auto-upgrade for node images
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --auto-upgrade-channel node-image
```

With `node-image` auto-upgrade, AKS automatically applies the latest node image (including security patches) to your Azure Linux nodes on a regular schedule.

## Compatibility Considerations

Most workloads run on Azure Linux without any changes because the container runtime (containerd) is the same, and your application containers bring their own userspace. However, there are a few things to watch for:

**Host-dependent workloads**: If your pods mount host paths or depend on specific host packages, they may need adjustment. Azure Linux has different package names and paths than Ubuntu.

**DaemonSets with host access**: Security tools, monitoring agents, and log collectors that run on the host may need Azure Linux-compatible versions.

**Node SSH**: Azure Linux uses a different SSH configuration. If you SSH into nodes, the experience is slightly different (different shell defaults, different available tools).

**Custom kernel modules**: If you load custom kernel modules, verify they are compatible with the Azure Linux kernel version.

## GPU Node Pools

Azure Linux supports GPU node pools for ML and HPC workloads:

```bash
# Create a GPU node pool with Azure Linux
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name gpulinux \
  --os-sku AzureLinux \
  --node-count 1 \
  --node-vm-size Standard_NC6s_v3
```

The NVIDIA device plugin and GPU drivers work the same way on Azure Linux as they do on Ubuntu.

Azure Linux is the future default for AKS nodes. Microsoft is investing heavily in it, and the security and performance benefits make it the obvious choice for production workloads. If you are starting a new cluster, use Azure Linux from the beginning. If you have an existing cluster, plan a migration - your security team will thank you.
