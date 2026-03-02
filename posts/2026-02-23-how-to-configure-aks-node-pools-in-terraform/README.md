# How to Configure AKS Node Pools in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, AKS, Kubernetes, Node Pool, Infrastructure as Code, DevOps

Description: Learn how to configure multiple AKS node pools in Terraform including system pools, user pools, GPU pools, and spot instances for cost optimization.

---

A single node pool rarely cuts it for production Kubernetes workloads. Different applications have different resource needs - your web frontend does not need the same VM size as your machine learning pipeline. AKS supports multiple node pools, and Terraform makes it straightforward to define and manage them all in code.

This guide covers how to add and configure different types of node pools for an AKS cluster using Terraform, including system pools, user workload pools, GPU-enabled pools, and spot instance pools for cost savings.

## How AKS Node Pools Work

AKS clusters have two types of node pools:

- **System node pools** run Kubernetes system components like CoreDNS, kube-proxy, and the metrics server. Every cluster needs at least one.
- **User node pools** run your application workloads. You can add as many as you need with different VM sizes and configurations.

Each node pool maps to a Virtual Machine Scale Set in Azure, which handles scaling the underlying VMs.

## Base Cluster Configuration

Start with a basic AKS cluster that has a minimal system node pool.

```hcl
# main.tf
# Resource group for all AKS resources

resource "azurerm_resource_group" "aks" {
  name     = "rg-aks-multipool"
  location = "East US"
}

# The AKS cluster with a small system node pool
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-multipool"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  dns_prefix          = "aks-multipool"
  kubernetes_version  = "1.28"

  # Keep the system pool small - it only runs system components
  default_node_pool {
    name                = "system"
    node_count          = 3
    vm_size             = "Standard_D2s_v5"
    vnet_subnet_id      = azurerm_subnet.aks.id
    os_disk_size_gb     = 64
    os_disk_type        = "Managed"
    max_pods            = 30
    zones               = [1, 2, 3]
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 5

    # Taint system nodes so user workloads don't land here
    only_critical_addons_enabled = true
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "calico"
    service_cidr   = "10.1.0.0/16"
    dns_service_ip = "10.1.0.10"
  }
}
```

## General Purpose User Node Pool

This pool handles the bulk of your application workloads - web servers, APIs, background workers.

```hcl
# node-pools.tf
# General purpose pool for standard application workloads

resource "azurerm_kubernetes_cluster_node_pool" "general" {
  name                  = "general"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D4s_v5"
  os_disk_size_gb       = 128
  os_disk_type          = "Managed"
  max_pods              = 50
  zones                 = [1, 2, 3]

  # Autoscaling handles traffic fluctuations
  enable_auto_scaling = true
  min_count           = 2
  max_count           = 10

  # Labels help with pod scheduling
  node_labels = {
    "workload-type" = "general"
    "environment"   = "production"
  }

  tags = {
    environment = "production"
    pool_type   = "general"
  }
}
```

## Memory-Optimized Node Pool

Some workloads like in-memory caches or data processing need more RAM relative to CPU.

```hcl
# Memory-optimized pool for high-memory workloads
resource "azurerm_kubernetes_cluster_node_pool" "memory" {
  name                  = "memory"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_E4s_v5"  # E-series has higher memory-to-CPU ratio
  os_disk_size_gb       = 128
  max_pods              = 30
  zones                 = [1, 2, 3]

  enable_auto_scaling = true
  min_count           = 1
  max_count           = 5

  node_labels = {
    "workload-type" = "memory-optimized"
  }

  # Use taints to prevent general workloads from landing here
  node_taints = [
    "workload-type=memory-optimized:NoSchedule"
  ]

  tags = {
    pool_type = "memory-optimized"
  }
}
```

## GPU Node Pool

For machine learning inference or GPU-accelerated workloads, you need nodes with NVIDIA GPUs.

```hcl
# GPU pool for ML inference and GPU workloads
resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_NC6s_v3"  # 1x V100 GPU per node
  os_disk_size_gb       = 256
  max_pods              = 20
  zones                 = [1]  # GPU VMs may not be available in all zones

  # Scale to zero when no GPU workloads are running
  enable_auto_scaling = true
  min_count           = 0
  max_count           = 4

  node_labels = {
    "workload-type"           = "gpu"
    "nvidia.com/gpu.present" = "true"
  }

  # Taint ensures only GPU workloads get scheduled here
  node_taints = [
    "nvidia.com/gpu=present:NoSchedule"
  ]

  tags = {
    pool_type = "gpu"
  }
}
```

## Spot Instance Node Pool

Spot instances cost significantly less than regular VMs but can be evicted at any time. They work well for fault-tolerant batch processing and stateless workloads.

```hcl
# Spot instance pool for cost-sensitive, fault-tolerant workloads
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  name                  = "spot"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D4s_v5"
  os_disk_size_gb       = 128
  max_pods              = 50
  zones                 = [1, 2, 3]

  # Priority setting makes this a spot instance pool
  priority        = "Spot"
  eviction_policy = "Delete"  # Delete VMs when evicted rather than deallocating
  spot_max_price  = -1        # Use -1 for market price (pay whatever it costs)

  enable_auto_scaling = true
  min_count           = 0
  max_count           = 20

  node_labels = {
    "workload-type"                        = "spot"
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  # Spot nodes get a taint automatically, but add one explicitly for clarity
  node_taints = [
    "kubernetes.azure.com/scalesetpriority=spot:NoSchedule"
  ]

  tags = {
    pool_type = "spot"
  }
}
```

## Scheduling Workloads to Specific Pools

After creating node pools, you need to tell Kubernetes where to place each workload. Use node selectors and tolerations in your pod specs.

For the general pool:

```yaml
# deployment-general.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      # Target the general node pool
      nodeSelector:
        workload-type: general
      containers:
        - name: web-api
          image: myregistry.azurecr.io/web-api:latest
```

For the GPU pool:

```yaml
# deployment-gpu.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      nodeSelector:
        workload-type: gpu
      # Tolerate the GPU taint
      tolerations:
        - key: nvidia.com/gpu
          operator: Equal
          value: present
          effect: NoSchedule
      containers:
        - name: inference
          image: myregistry.azurecr.io/ml-inference:latest
          resources:
            limits:
              nvidia.com/gpu: 1
```

## Using Variables for Flexibility

Define variables so the same configuration works across environments.

```hcl
# variables.tf
variable "node_pools" {
  description = "Map of additional node pool configurations"
  type = map(object({
    vm_size         = string
    min_count       = number
    max_count       = number
    os_disk_size_gb = number
    max_pods        = number
    node_labels     = map(string)
    node_taints     = list(string)
    priority        = optional(string, "Regular")
    zones           = optional(list(string), ["1", "2", "3"])
  }))
}
```

This lets you define pools in a tfvars file:

```hcl
# production.tfvars
node_pools = {
  general = {
    vm_size         = "Standard_D4s_v5"
    min_count       = 2
    max_count       = 10
    os_disk_size_gb = 128
    max_pods        = 50
    node_labels     = { "workload-type" = "general" }
    node_taints     = []
  }
  spot = {
    vm_size         = "Standard_D4s_v5"
    min_count       = 0
    max_count       = 20
    os_disk_size_gb = 128
    max_pods        = 50
    node_labels     = { "workload-type" = "spot" }
    node_taints     = ["kubernetes.azure.com/scalesetpriority=spot:NoSchedule"]
    priority        = "Spot"
  }
}
```

## Upgrading Node Pools

When upgrading Kubernetes versions, upgrade node pools in sequence. The system pool should be upgraded first.

```hcl
# Use max_surge to control how many extra nodes are created during upgrades
resource "azurerm_kubernetes_cluster_node_pool" "general" {
  # ... other settings ...

  upgrade_settings {
    max_surge = "33%"  # Create up to 33% extra nodes during rolling upgrade
  }
}
```

## Practical Tips

**Start with autoscaling enabled.** It is much easier to turn it on from the beginning than to retrofit it later. Set min_count to your baseline and max_count to handle peak load.

**Use taints and tolerations.** Without them, the Kubernetes scheduler will happily place your web server pods on expensive GPU nodes. Taints prevent that.

**Scale GPU and spot pools to zero.** Setting min_count to 0 means you pay nothing when those pools have no workloads. The cluster autoscaler will add nodes when pods with matching tolerations appear.

**Name node pools carefully.** AKS pool names must be 1-12 characters, lowercase alphanumeric only. No hyphens or underscores allowed.

For the next step in your AKS Terraform journey, check out [creating Azure Kubernetes Service clusters in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-kubernetes-service-aks-in-terraform/view) if you have not already set up the base cluster.
