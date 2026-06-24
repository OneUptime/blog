# How to Configure AKS with Azure CNI Networking Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Azure CNI, Kubernetes Networking, VNet Integration, Infrastructure as Code

Description: Learn how to configure AKS with Azure CNI networking using OpenTofu to assign VNet IP addresses directly to pods for native Azure network integration and Network Policy enforcement.

## Introduction

With Azure CNI's flat networking models, pods can receive real Azure VNet IP addresses directly, making them first-class citizens in the VNet. This enables direct pod-to-pod communication across peered VNets, Network Policy enforcement using Azure or Calico, and access to Azure PaaS services via Service Endpoints or Private Endpoints from pods. Azure CNI Overlay is the alternative model that uses a separate pod CIDR to reduce VNet IP consumption. Unlike kubenet (which uses NAT), flat Azure CNI requires more IP address planning since every pod consumes a VNet IP.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with AKS and Network permissions
- A VNet with enough address space for your chosen CNI mode: nodes + pods for flat Azure CNI, or nodes plus a separate pod CIDR for Overlay

## Step 1: Plan IP Addresses

For Azure CNI Node Subnet, size the subnet for nodes and pods, and include upgrade surge capacity. A good baseline is `(nodes + max_surge_nodes) + ((nodes + max_surge_nodes) × max_pods)`, then account for Azure's five reserved subnet IPs. For 10 nodes, a default max surge of 1, and 30 pods per node, you need 341 usable IPs, so a /23 subnet is sufficient.

```hcl
# AKS subnet sized for up to 30 nodes, 30 pods per node, plus upgrade headroom

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet_name
  address_prefixes     = ["10.1.0.0/21"]  # /21 = 2048 total IPs (2043 usable)

  service_endpoints = ["Microsoft.Storage", "Microsoft.Sql"]
}
```

## Step 2: Create AKS Cluster with Azure CNI Node Subnet

This example uses the Azure CNI Node Subnet model, where pods consume IPs directly from the cluster subnet.

```hcl
resource "azurerm_kubernetes_cluster" "azure_cni" {
  name                = "${var.project_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    min_count           = 3
    max_count           = 10
    enable_auto_scaling = true

    vnet_subnet_id = azurerm_subnet.aks.id
    max_pods       = 30  # IPs per node reserved in subnet

    os_disk_type = "Ephemeral"
    zones        = ["1", "2", "3"]
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"      # Azure CNI Node Subnet
    network_policy    = "azure"      # Azure Network Policy or "calico"
    load_balancer_sku = "standard"
    service_cidr      = "10.200.0.0/16"   # Must not overlap with VNet
    dns_service_ip    = "10.200.0.10"     # Within service_cidr
  }

  tags = {
    Name = "${var.project_name}-aks-azure-cni"
  }
}

# Grant AKS cluster network contributor on the VNet
resource "azurerm_role_assignment" "aks_network" {
  scope                = var.vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.azure_cni.identity[0].principal_id
}
```

Use `az aks get-versions --location <region>` to choose a currently supported Kubernetes version for your subscription and region.

## Step 3: Azure CNI Overlay (Reduces IP Consumption)

If you want Azure CNI Overlay instead of flat Azure CNI, use this cluster definition. Azure CNI Overlay uses a private CIDR for pods (not VNet IPs), combining the management simplicity of Azure CNI with reduced IP address consumption.

```hcl
resource "azurerm_kubernetes_cluster" "cni_overlay" {
  name                = "${var.project_name}-aks-overlay"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.project_name}-overlay"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 20

    vnet_subnet_id = azurerm_subnet.aks.id
    max_pods       = 250  # Higher pod density with overlay
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"  # Azure CNI Overlay
    network_policy      = "calico"
    pod_cidr            = "192.168.0.0/16"  # Private CIDR for pods (not VNet)
    service_cidr        = "10.200.0.0/16"
    dns_service_ip      = "10.200.0.10"
  }
}

resource "azurerm_role_assignment" "cni_overlay_network" {
  scope                = var.vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.cni_overlay.identity[0].principal_id
}
```

## Step 4: Network Policy Enforcement

```yaml
# kubernetes/network-policy.yaml (apply after cluster creation)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Get credentials
az aks get-credentials \
  --resource-group <rg> \
  --name <cluster-name>

# Verify pod networking
kubectl get pods -A -o wide

# With Azure CNI Node Subnet, pod IPs should come from the AKS subnet.
# With Azure CNI Overlay, pod IPs should come from the pod_cidr range.

# Check node internal IPs
kubectl get nodes -o wide
```

## Conclusion

Choose flat Azure CNI when workloads require direct pod reachability from connected networks or direct pod IP exposure to external services. Use Azure CNI Overlay when you want Azure CNI management with lower VNet IP consumption. For flat Azure CNI, calculate subnet size as `(nodes + max_surge_nodes) + ((nodes + max_surge_nodes) × max_pods)` and remember that Azure reserves five IPs in every subnet. With Azure CNI Node Subnet, set `max_pods` between 30-50 per node to balance pod density with subnet IP consumption; with CNI Overlay, you can use up to 250 pods per node since pods use a separate CIDR.
