# Using Terraform Modules to Deploy AKS Clusters with Azure CNI Networking
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Terraform, AKS, Azure CNI, Kubernetes, Networking
Description: A complete guide to deploying Azure Kubernetes Service clusters with Azure CNI networking using Terraform modules, covering VNet integration, IP planning, network policies, and production configurations.
---

Azure Kubernetes Service (AKS) supports two primary networking models: kubenet and Azure CNI. While kubenet is simpler, Azure CNI assigns real Azure VNet IP addresses to every pod, enabling direct communication between pods and other Azure resources without NAT. This is essential for workloads that need to interact with Azure services through private endpoints, VNet peering, or network security groups at the pod level. This guide demonstrates how to deploy AKS with Azure CNI using Terraform modules, covering network planning, cluster configuration, and production hardening.

## Azure CNI vs Kubenet

With kubenet, pods get IP addresses from a virtual network space that is separate from the Azure VNet. Pod-to-pod communication across nodes requires user-defined routes (UDRs), and pods appear to external Azure resources as the node's IP address through NAT.

With Azure CNI, every pod gets an IP address directly from the Azure VNet subnet. Pods are fully addressable within the VNet, can be targeted by network security groups, and can communicate directly with other VNet resources and peered networks. The tradeoff is that Azure CNI requires more IP addresses because every pod consumes a real VNet IP.

## IP Address Planning

Before deploying, plan your IP address space carefully. Each node in an Azure CNI cluster reserves IP addresses for the maximum number of pods it can run. The default is 30 pods per node. For a node pool with 5 nodes, you need at least 5 (nodes) x 30 (pods) + 5 (node IPs) = 155 IP addresses, plus addresses for services and headroom for scaling.

A `/22` subnet (1,022 usable IPs) is a good starting point for small to medium clusters. For larger clusters, use a `/20` or larger.

## Step 1: Define the VNet and Subnets

Start by creating the network infrastructure:

```hcl
resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-rg"
  location = var.location
}

resource "azurerm_virtual_network" "main" {
  name                = "${var.project_name}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "aks_nodes" {
  name                 = "aks-nodes"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.0.0/22"]
}

resource "azurerm_subnet" "aks_internal_lb" {
  name                 = "aks-internal-lb"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.4.0/24"]
}
```

The `aks-nodes` subnet hosts pod and node IPs. The `aks-internal-lb` subnet is for internal load balancers used by Kubernetes services of type LoadBalancer with the internal annotation.

## Step 2: Create an AKS Terraform Module

Organize your AKS configuration as a reusable module:

```hcl
# modules/aks/variables.tf
variable "cluster_name" {
  type        = string
  description = "Name of the AKS cluster"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version"
  default     = "1.29"
}

variable "subnet_id" {
  type        = string
  description = "Subnet ID for the default node pool"
}

variable "service_cidr" {
  type        = string
  description = "CIDR for Kubernetes services"
  default     = "10.1.0.0/16"
}

variable "dns_service_ip" {
  type        = string
  description = "IP address for the DNS service"
  default     = "10.1.0.10"
}

variable "default_node_pool_vm_size" {
  type        = string
  default     = "Standard_D4s_v5"
}

variable "default_node_pool_count" {
  type        = number
  default     = 3
}

variable "max_pods_per_node" {
  type        = number
  default     = 50
}

variable "network_policy" {
  type        = string
  description = "Network policy plugin: azure or calico"
  default     = "azure"
}
```

```hcl
# modules/aks/main.tf
resource "azurerm_user_assigned_identity" "aks" {
  name                = "${var.cluster_name}-identity"
  location            = var.location
  resource_group_name = var.resource_group_name
}

resource "azurerm_role_assignment" "aks_network" {
  scope                = var.subnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.aks.principal_id
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "system"
    node_count          = var.default_node_pool_count
    vm_size             = var.default_node_pool_vm_size
    vnet_subnet_id      = var.subnet_id
    max_pods            = var.max_pods_per_node
    os_disk_size_gb     = 128
    os_disk_type        = "Managed"
    type                = "VirtualMachineScaleSets"
    enable_auto_scaling = true
    min_count           = var.default_node_pool_count
    max_count           = var.default_node_pool_count * 3

    node_labels = {
      "nodepool" = "system"
    }
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.aks.id]
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = var.network_policy
    service_cidr      = var.service_cidr
    dns_service_ip    = var.dns_service_ip
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
  }

  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id
  }

  depends_on = [
    azurerm_role_assignment.aks_network
  ]
}

resource "azurerm_log_analytics_workspace" "aks" {
  name                = "${var.cluster_name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}
```

```hcl
# modules/aks/outputs.tf
output "cluster_id" {
  value = azurerm_kubernetes_cluster.main.id
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "kube_config" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}

output "kubelet_identity" {
  value = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

output "node_resource_group" {
  value = azurerm_kubernetes_cluster.main.node_resource_group
}
```

## Step 3: Use the Module

In your root configuration:

```hcl
# main.tf
module "aks" {
  source = "./modules/aks"

  cluster_name          = "production-aks"
  location              = azurerm_resource_group.main.location
  resource_group_name   = azurerm_resource_group.main.name
  kubernetes_version    = "1.29"
  subnet_id             = azurerm_subnet.aks_nodes.id
  service_cidr          = "10.1.0.0/16"
  dns_service_ip        = "10.1.0.10"
  default_node_pool_vm_size = "Standard_D4s_v5"
  default_node_pool_count   = 3
  max_pods_per_node     = 50
  network_policy        = "azure"
}
```

## Step 4: Add Additional Node Pools

Production clusters typically have multiple node pools for different workload types:

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "workload" {
  name                  = "workload"
  kubernetes_cluster_id = module.aks.cluster_id
  vm_size               = "Standard_D8s_v5"
  node_count            = 3
  vnet_subnet_id        = azurerm_subnet.aks_nodes.id
  max_pods              = 50
  os_disk_size_gb       = 256
  enable_auto_scaling   = true
  min_count             = 3
  max_count             = 20

  node_labels = {
    "nodepool" = "workload"
  }

  node_taints = []
}

resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpu"
  kubernetes_cluster_id = module.aks.cluster_id
  vm_size               = "Standard_NC6s_v3"
  node_count            = 0
  vnet_subnet_id        = azurerm_subnet.aks_nodes.id
  max_pods              = 30
  enable_auto_scaling   = true
  min_count             = 0
  max_count             = 4

  node_labels = {
    "nodepool"             = "gpu"
    "nvidia.com/gpu.present" = "true"
  }

  node_taints = [
    "nvidia.com/gpu=present:NoSchedule"
  ]
}
```

## Step 5: Configure Network Policies

With Azure CNI and Azure Network Policy (or Calico), you can enforce network segmentation at the pod level:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8080
          protocol: TCP
```

Because Azure CNI assigns VNet IPs to pods, these network policies are enforced by Azure's network infrastructure, not just iptables rules on the nodes.

## Step 6: Private Cluster Configuration

For maximum security, configure AKS as a private cluster where the API server is not exposed to the internet:

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  # ... existing config ...

  private_cluster_enabled             = true
  private_dns_zone_id                 = "System"
  private_cluster_public_fqdn_enabled = false

  api_server_access_profile {
    authorized_ip_ranges = []
  }
}
```

With a private cluster, the API server gets a private IP within your VNet. You will need a jumpbox, VPN gateway, or Azure Bastion to access the cluster.

## Troubleshooting Azure CNI

**IP exhaustion**: If pods are stuck in Pending with "failed to allocate IP" errors, your subnet is running out of IP addresses. Either reduce `max_pods` per node or use a larger subnet.

**Slow pod startup**: Azure CNI assigns IPs through the Azure networking stack, which can be slower than kubenet. Use the `azure-cni-overlay` network plugin for better IP efficiency while retaining VNet integration.

**Cross-subnet communication**: If pods cannot reach resources in peered VNets, check that the VNet peering is configured with "Allow forwarded traffic" and that UDRs are not blocking pod CIDR ranges.

## Conclusion

Deploying AKS with Azure CNI via Terraform modules gives you a repeatable, version-controlled infrastructure setup with enterprise-grade networking. Azure CNI provides true VNet integration for your pods, enabling network security groups, private endpoints, and VNet peering at the pod level. Plan your IP address space carefully, use multiple node pools for workload isolation, enable network policies for microsegmentation, and consider private cluster mode for security-sensitive environments. With the module pattern shown here, you can deploy consistent AKS clusters across development, staging, and production environments by simply changing input variables.
