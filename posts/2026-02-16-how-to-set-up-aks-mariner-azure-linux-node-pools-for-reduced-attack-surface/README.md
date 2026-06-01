# How to Set Up AKS Mariner (Azure Linux) Node Pools for Reduced Attack Surface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Azure Linux, Mariner, Security, Node Pool, Kubernetes, Container Host

Description: Learn how to create AKS node pools using Azure Linux (CBL-Mariner) for a minimal, security-hardened container host with reduced attack surface.

---

Many existing AKS clusters run Ubuntu as the node operating system. Ubuntu is a solid general-purpose Linux distribution, but it comes with a lot of packages and services that a Kubernetes node does not need. Every extra package is a potential attack vector, and every unnecessary service is something that could have a vulnerability.

Azure Linux (formerly CBL-Mariner) is Microsoft's container-optimized Linux distribution designed specifically for hosting container workloads. It includes only the packages needed to run Kubernetes and containers, resulting in a significantly smaller attack surface. This guide covers setting up Azure Linux node pools on AKS and what to expect when you make the switch.

## What Is Azure Linux (CBL-Mariner)

CBL-Mariner stands for Common Base Linux - Mariner. It is Microsoft's open-source Linux distribution that has been used in production across Azure services for years. It is not a fork of Ubuntu or Debian - it is built from scratch with a focus on:

- **Minimal package set**: Only includes what is needed for container hosting
- **Small image size**: Azure Linux has about 500 packages and can use up to 5 GB less disk space on AKS
- **Fast boot time**: Less to initialize means nodes come up faster
- **Security hardening**: Fewer packages means fewer CVEs to patch
- **Rapid patching**: Microsoft controls the full supply chain and can push security patches quickly

In practice, this means your nodes have fewer installed packages, fewer running services, and a smaller attack surface compared to Ubuntu-based nodes.

## Prerequisites

- Azure CLI 2.61 or later
- An existing AKS cluster (or create a new one)
- Understanding that Azure Linux is the node OS, not the container runtime - your application containers are unaffected
- For Kubernetes versions 1.32 and later, Azure Linux 3.0 is the default Azure Linux generation on AKS. Azure Linux 2.0 is retired and no longer receives AKS security updates.

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
# Expected: CBL-Mariner/Linux, Azure Linux, or Azure Linux 3.0

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
# Azure Linux has about 500 packages; Ubuntu package counts vary by image
```

## Step 4: Migrate Workloads from Ubuntu to Azure Linux

To migrate workloads from Ubuntu node pools to Azure Linux node pools, use node selectors or gradually shift traffic.

### Using Node Labels

AKS node pools have a specific label you can use for scheduling:

```bash
# Check labels on Azure Linux nodes
kubectl get nodes -l kubernetes.azure.com/agentpool=azlinuxpool --show-labels
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
        kubernetes.azure.com/agentpool: azlinuxpool
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
kubectl cordon -l kubernetes.azure.com/agentpool=ubuntupool

# Step 3: Drain the old pool (move existing pods to Azure Linux nodes)
kubectl drain -l kubernetes.azure.com/agentpool=ubuntupool \
  --ignore-daemonsets \
  --delete-emptydir-data

# Step 4: Verify all workloads are running on Azure Linux nodes
kubectl get nodes -l kubernetes.azure.com/agentpool=azlinuxpool
kubectl get pods -o wide --all-namespaces

# Step 5: Delete the old Ubuntu node pool
az aks nodepool delete \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name ubuntupool
```

## Step 5: Understanding Package Management

Azure Linux uses RPM packages (via `dnf`) instead of APT/DPKG. If you need to install additional packages on nodes for debugging:

```bash
# Inside a node debug session
kubectl debug node/<node-name> -it --image=busybox
chroot /host

# List installed packages
dnf list installed

# Search for a package
dnf search tcpdump

# Install a package (for temporary debugging only)
dnf install -y tcpdump
```

For production, you should never install additional packages directly on nodes. Use purpose-built debug containers or DaemonSets with the tools you need.

## Step 6: Security Comparison

Let us look at the concrete security differences between Ubuntu and Azure Linux nodes.

### Installed Packages

```bash
# On an Azure Linux node
rpm -qa | wc -l
# Typical output: about 500 packages

# On an Ubuntu node (for comparison)
# dpkg -l | wc -l
# Output varies by Ubuntu node image
```

Fewer packages means:
- Fewer CVEs that affect your nodes
- Faster security scanning
- Less surface area for attackers

### Running Services

```bash
# Check running services on Azure Linux
systemctl list-units --type=service --state=running

# Output varies by node image and enabled agents
```

Azure Linux focuses on the essential services for container hosting, such as kubelet, containerd, networking, and a handful of system services. Ubuntu includes many additional services that are not needed for container hosting.

### Kernel Hardening

Azure Linux uses a Microsoft-hardened kernel with Azure cloud optimizations and security-focused defaults. Microsoft also validates Azure Linux images and packages before release and publishes security patches monthly, with critical updates released within days when necessary.

## Step 7: Configure Automatic OS Updates

Azure Linux nodes receive security updates through AKS node OS upgrade channels and node image upgrades.

```bash
# Check the current node image version
az aks nodepool show \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name azlinuxpool \
  --query nodeImageVersion -o tsv

# Enable automatic node OS security patching
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --node-os-upgrade-channel SecurityPatch
```

With the `SecurityPatch` node OS upgrade channel, AKS applies tested OS security patches to your Azure Linux CPU node pools while honoring maintenance windows and surge settings. If you want weekly patched VHDs that include security fixes and bug fixes, use the `NodeImage` node OS upgrade channel instead.

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

On AKS GPU nodes, Microsoft installs and maintains NVIDIA drivers as part of the node image by default, but you still need to deploy the NVIDIA device plugin or use an option such as the NVIDIA GPU Operator. Azure Linux GPU-enabled node pools also have a specific limitation: automatic security patches are not applied, so plan GPU node image upgrades separately.

Azure Linux 3.0 is the default Azure Linux node OS generation for AKS version 1.32 and later. Microsoft is investing heavily in it, and the security and performance benefits make it the obvious choice for production workloads. If you are starting a new cluster, use Azure Linux from the beginning. If you have an existing cluster, plan a migration - your security team will thank you.
