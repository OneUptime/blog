# How to Configure AKS Azure AD Integration with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Azure AD, RBAC, Authentication, Infrastructure as Code

Description: Learn how to configure AKS Azure AD integration with OpenTofu to use Azure AD identities for cluster authentication and Kubernetes RBAC authorization.

## Introduction

AKS Azure AD integration (managed AAD) allows users to authenticate to Kubernetes using Azure AD credentials (including MFA), and Kubernetes RBAC authorization can be bound to Azure AD users and groups. This replaces static kubeconfig credentials with short-lived Azure AD tokens, eliminates credential management overhead, and enables centralized identity governance through Azure AD. The managed AAD integration also supports Local Accounts Disabled mode to enforce AAD-only access.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with AKS and Azure AD permissions
- Azure AD groups for cluster access

## Step 1: Create AKS with Azure AD Integration

```hcl
# Azure AD groups for access control

data "azuread_group" "cluster_admins" {
  display_name     = "${var.project_name}-aks-admins"
  security_enabled = true
}

data "azuread_group" "cluster_developers" {
  display_name     = "${var.project_name}-aks-developers"
  security_enabled = true
}

resource "azurerm_kubernetes_cluster" "aad" {
  name                = "${var.project_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    min_count           = 3
    max_count           = 10
    enable_auto_scaling = true
    vnet_subnet_id      = var.subnet_id
  }

  identity {
    type = "SystemAssigned"
  }

  # Azure AD integration (managed AAD)
  azure_active_directory_role_based_access_control {
    # Cluster admin groups have full cluster access
    admin_group_object_ids = [data.azuread_group.cluster_admins.object_id]

    # Enable Azure RBAC for Kubernetes authorization
    azure_rbac_enabled = true
  }

  # Disable local accounts - enforce AAD-only authentication
  local_account_disabled = true

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }

  tags = {
    Name = "${var.project_name}-aks-aad"
  }
}
```

## Step 2: Azure RBAC Bindings for AKS

```hcl
# Grant developers "Azure Kubernetes Service Cluster User Role"
resource "azurerm_role_assignment" "developer_user" {
  scope                = azurerm_kubernetes_cluster.aad.id
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = data.azuread_group.cluster_developers.object_id
}

# Grant admins full cluster admin access via Azure RBAC
resource "azurerm_role_assignment" "admin_cluster_admin" {
  scope                = azurerm_kubernetes_cluster.aad.id
  role_definition_name = "Azure Kubernetes Service RBAC Cluster Admin"
  principal_id         = data.azuread_group.cluster_admins.object_id
}

# Namespace-specific access for developers
resource "azurerm_role_assignment" "developer_namespace" {
  scope                = "${azurerm_kubernetes_cluster.aad.id}/namespaces/production"
  role_definition_name = "Azure Kubernetes Service RBAC Writer"
  principal_id         = data.azuread_group.cluster_developers.object_id
}
```

## Step 3: Kubernetes RBAC with AAD Groups

```hcl
# Optional: apply Kubernetes RBAC bindings when you want to author access as Kubernetes manifests
resource "kubernetes_cluster_role_binding_v1" "developer_view" {
  metadata {
    name = "aad-developers-view"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "view"
  }

  subject {
    kind = "Group"
    name = data.azuread_group.cluster_developers.object_id  # AAD Group Object ID
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Step 4: Workload Identity (Pod-Level Azure AD)

```hcl
resource "azurerm_kubernetes_cluster" "workload_identity" {
  name                = "${var.project_name}-aks-wi"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name

  default_node_pool {
    name           = "system"
    vm_size        = "Standard_D4s_v3"
    node_count     = 3
    vnet_subnet_id = var.subnet_id
  }

  identity {
    type = "SystemAssigned"
  }

  azure_active_directory_role_based_access_control {
    azure_rbac_enabled     = true
    admin_group_object_ids = [data.azuread_group.cluster_admins.object_id]
  }

  # Enable OIDC issuer for Workload Identity
  oidc_issuer_enabled       = true
  workload_identity_enabled = true  # Replaces AAD Pod Identity

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }
}

# User-assigned managed identity for pods
resource "azurerm_user_assigned_identity" "app" {
  name                = "${var.project_name}-app-identity"
  location            = var.location
  resource_group_name = var.resource_group_name
}

# Federated credential links Kubernetes ServiceAccount to managed identity
resource "azurerm_federated_identity_credential" "app" {
  name                      = "${var.project_name}-app-federated"
  user_assigned_identity_id = azurerm_user_assigned_identity.app.id

  issuer  = azurerm_kubernetes_cluster.workload_identity.oidc_issuer_url
  subject = "system:serviceaccount:production:app-service-account"

  audience = ["api://AzureADTokenExchange"]
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Get AAD-integrated credentials
az aks get-credentials \
  --resource-group <rg> \
  --name <cluster-name>

# On AKS 1.24+, interactive sign-in uses the exec/kubelogin flow automatically
kubectl get nodes

# Check current identity
kubectl auth whoami

# Get admin credentials (break-glass only; re-enable local accounts first if disabled)
az aks get-credentials \
  --resource-group <rg> \
  --name <cluster-name> \
  --admin
```

## Conclusion

Enable `workload_identity_enabled = true` with `oidc_issuer_enabled = true` for pod-to-Azure service authentication-this replaces the deprecated AAD Pod Identity and provides a standardized OIDC-based approach. Set `local_account_disabled = true` in production to enforce Azure AD for all authentication and prevent use of static kubeconfig credentials. For Kubernetes RBAC subjects mapped to Azure AD groups, use the group's Object ID (not display name) as the subject name in RoleBindings-Kubernetes doesn't resolve AAD group names, only object IDs.
