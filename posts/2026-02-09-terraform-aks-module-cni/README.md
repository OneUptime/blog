# Using Terraform Modules to Deploy AKS Clusters with Azure CNI Networking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AKS, Azure CNI, Kubernetes, Networking

Description: A complete guide to deploying Azure Kubernetes Service clusters with Azure CNI networking using Terraform modules, covering VNet integration, IP planning, network policies.

---

Azure Kubernetes Service (AKS) supports multiple networking options, including legacy kubenet and Azure CNI modes. While kubenet is simpler, Azure CNI flat networking assigns real Azure VNet IP addresses to every pod, enabling direct communication between pods and other Azure resources without NAT. This is useful for workloads that need to interact with Azure services through private endpoints, VNet peering, or subnet-level network security groups. This guide demonstrates how to deploy AKS with Azure CNI using Terraform modules, covering network planning, cluster configuration, and production hardening.

## Azure CNI vs Kubenet

With kubenet, pods get IP addresses from a virtual network space that is separate from the Azure VNet. Pod-to-pod communication across nodes uses routes managed by AKS or by a user-defined route table, and pods appear to external Azure resources as the node's IP address through NAT. Kubenet is scheduled for retirement in AKS on March 31, 2028, so use Azure CNI for new production designs.

With Azure CNI flat networking, every pod gets an IP address directly from an Azure VNet subnet. Pods are fully addressable within the VNet, are subject to subnet-level network security groups and route tables, and can communicate directly with other VNet resources and peered networks. The tradeoff is that Azure CNI requires more IP addresses because every pod consumes a real VNet IP.

## IP Address Planning

Before deploying, plan your IP address space carefully. Each node in an Azure CNI node subnet cluster reserves IP addresses for the maximum number of pods it can run. The default is 30 pods per node. For a node pool with 5 nodes, you need at least 5 (nodes) x 30 (pods) + 5 (node IPs) = 155 IP addresses, plus headroom for upgrade surge nodes, internal load balancer front-end IPs, and scaling.

A `/22` subnet (1,019 usable IPs in Azure after reserved addresses) is a good starting point for small to medium clusters. For larger clusters, use a `/20` or larger.

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

The `aks-nodes` subnet hosts pod and node IPs. Internal load balancer front-end IPs are allocated from the node subnet by default; use the `aks-internal-lb` subnet only if you configure the Kubernetes internal load balancer subnet annotation and grant the cluster identity permissions on that subnet.

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
  default     = "1.35"
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
    auto_scaling_enabled  = true
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
    azure_rbac_enabled = true
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
  kubernetes_version    = "1.35"
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
  auto_scaling_enabled  = true
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
  auto_scaling_enabled  = true
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

Because Azure CNI assigns VNet IPs to pods, the pod IPs are visible on the VNet. Network policy enforcement is still handled by the configured AKS network policy engine, such as Azure Network Policy Manager, Calico, or Cilium.

## Step 6: Private Cluster Configuration

For maximum security, configure AKS as a private cluster where the API server is not exposed to the internet:

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  # ... existing config ...

  private_cluster_enabled             = true
  private_dns_zone_id                 = "System"
  private_cluster_public_fqdn_enabled = false
}
```

With a private cluster, the API server is exposed through a private endpoint in your VNet. You will need a jumpbox, VPN gateway, or Azure Bastion to access the cluster. API server authorized IP ranges apply only to the public API server endpoint, not to the private endpoint.

## Troubleshooting Azure CNI

**IP exhaustion**: If pods are stuck in Pending with "failed to allocate IP" errors, your subnet is running out of IP addresses. Either reduce `max_pods` per node or use a larger subnet.

**Slow pod startup**: Azure CNI assigns IPs through the Azure networking stack, which can be slower than kubenet. Consider Azure CNI Overlay for better IP efficiency if your workloads don't require directly routable pod IPs.

**Cross-subnet communication**: If pods cannot reach resources in peered VNets, check that the VNet peering is configured with "Allow forwarded traffic" and that UDRs are not blocking the AKS node subnet ranges.

## Conclusion

Deploying AKS with Azure CNI via Terraform modules gives you a repeatable, version-controlled infrastructure setup with enterprise-grade networking. Azure CNI flat networking provides true VNet integration for your pods, enabling direct pod connectivity with private endpoints and peered networks while applying subnet-level network controls. Plan your IP address space carefully, use multiple node pools for workload isolation, enable network policies for microsegmentation, and consider private cluster mode for security-sensitive environments. With the module pattern shown here, you can deploy consistent AKS clusters across development, staging, and production environments by simply changing input variables.
