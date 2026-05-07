# How to Set Up AKS with kubenet Networking Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Kubenet, Kubernetes Networking, Route Tables, Infrastructure as Code

Description: Learn how to configure AKS with kubenet networking using OpenTofu, where nodes get VNet IPs but pods use a private CIDR routed through user-defined routes.

## Introduction

kubenet is AKS's simpler networking option where only nodes receive Azure VNet IP addresses, while pods get IPs from a private pod CIDR (`10.244.0.0/16` by default). AKS manages a route table that enables cross-node pod communication. kubenet uses less VNet IP space than Azure CNI (only one IP per node), making it suitable for smaller subnets. The trade-off is that pods aren't directly addressable from outside the cluster and Network Policy requires Calico.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with AKS and Network permissions
- A VNet and subnet (smaller than Azure CNI requirement)
- Route table for pod CIDR routes

## Step 1: Create Route Table for kubenet

```hcl
# AKS will add routes to this table for pod CIDRs per node

resource "azurerm_route_table" "aks" {
  name                          = "${var.project_name}-aks-rt"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  bgp_route_propagation_enabled = true  # Allow BGP for on-premises routing

  tags = {
    Name = "${var.project_name}-aks-route-table"
  }
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet_name
  address_prefixes     = ["10.0.1.0/24"]  # Smaller subnet OK with kubenet
}

resource "azurerm_subnet_route_table_association" "aks" {
  subnet_id      = azurerm_subnet.aks.id
  route_table_id = azurerm_route_table.aks.id
}
```

## Step 2: Create AKS Cluster with kubenet

```hcl
resource "azurerm_user_assigned_identity" "aks" {
  name                = "${var.project_name}-aks-identity"
  location            = var.location
  resource_group_name = var.resource_group_name
}

# With OpenTofu, grant the AKS identity access before cluster creation
resource "azurerm_role_assignment" "aks_subnet" {
  scope                = azurerm_subnet.aks.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.aks.principal_id
}

resource "azurerm_role_assignment" "aks_route_table" {
  scope                = azurerm_route_table.aks.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.aks.principal_id
}

resource "azurerm_kubernetes_cluster" "kubenet" {
  name                = "${var.project_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name
  kubernetes_version  = var.kubernetes_version  # Use a supported AKS minor version, such as 1.35

  default_node_pool {
    name                 = "system"
    vm_size              = "Standard_D4s_v3"
    node_count           = 3
    min_count            = 3
    max_count            = 10
    auto_scaling_enabled = true

    vnet_subnet_id = azurerm_subnet.aks.id
    max_pods       = 110  # Default for kubenet; configurable up to 250

    os_disk_type = "Ephemeral"
    zones        = ["1", "2", "3"]
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.aks.id]
  }

  network_profile {
    network_plugin    = "kubenet"   # kubenet networking
    network_policy    = "calico"    # Calico required for network policies with kubenet
    load_balancer_sku = "standard"
    pod_cidr          = "10.244.0.0/16"   # Private CIDR for pods
    service_cidr      = "10.200.0.0/16"
    dns_service_ip    = "10.200.0.10"
  }

  tags = {
    Name = "${var.project_name}-aks-kubenet"
  }

  depends_on = [
    azurerm_subnet_route_table_association.aks,
    azurerm_role_assignment.aks_subnet,
    azurerm_role_assignment.aks_route_table,
  ]
}
```

## Step 3: Add User Node Pool

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "app" {
  name                  = "app"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.kubenet.id
  vm_size               = "Standard_D4s_v3"
  node_count            = 3
  min_count             = 2
  max_count             = 20
  auto_scaling_enabled  = true

  vnet_subnet_id = azurerm_subnet.aks.id
  max_pods       = 110

  node_labels = {
    "workload-type" = "application"
  }

  upgrade_settings {
    max_surge = "33%"
  }
}
```

## Step 4: Network Policy with Calico

```yaml
# kubernetes/calico-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  # Empty ingress rules = deny all inbound traffic
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
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

# Verify route table (AKS adds routes for each node's pod CIDR)
az network route-table route list \
  --resource-group <rg> \
  --route-table-name <rt-name> \
  --output table

# Check pod networking (pods use 10.244.x.x IPs)
kubectl get pods -A -o wide

# Test Calico network policy (this should be blocked from the default namespace)
kubectl run test --image=busybox -it --rm --restart=Never -- wget -qO- http://backend-service.production.svc.cluster.local
```

## Conclusion

kubenet can still be useful when subnet IP space is limited or when your workloads don't need direct pod-level addressing, but AKS retires kubenet on March 31, 2028, so plan accordingly. The key limitation is that pod IPs (from `pod_cidr`) are not directly addressable the way Azure CNI pod IPs are-if pods need direct pod-level reachability, use Azure CNI. When you bring your own subnet and route table with OpenTofu, use a user-assigned managed identity and grant it `Network Contributor` on both the AKS subnet and the route table before cluster creation. The route table must be associated with the AKS node subnet before cluster creation.
