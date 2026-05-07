# How to Set Up AKS Private Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Private Cluster, Private Endpoint, Network Security, Infrastructure as Code

Description: Learn how to create AKS private clusters with OpenTofu to keep the Kubernetes API server endpoint completely private within your VNet, eliminating public API server exposure.

## Introduction

AKS private clusters configure the Kubernetes API server with a Private Endpoint inside your VNet, making it accessible only from within the VNet or connected networks (peered VNets, VPN, ExpressRoute). This eliminates the attack surface of a publicly-accessible API server and is required for high-security environments with strict network isolation requirements. kubectl commands and CI/CD pipelines must run from within the private network or through a jump box/Bastion.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with AKS permissions
- A VNet with Private DNS Zone support (or use Azure Private DNS Zone)

## Step 1: Create AKS Private Cluster

```hcl
resource "azurerm_kubernetes_cluster" "private" {
  name                = "${var.project_name}-aks-private"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.project_name}-private"
  kubernetes_version  = "1.35"

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    min_count           = 3
    max_count           = 10
    auto_scaling_enabled = true
    vnet_subnet_id      = var.aks_subnet_id
    zones               = ["1", "2", "3"]

    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  # Make API server private
  private_cluster_enabled             = true
  private_dns_zone_id                 = "System"  # Use Azure-managed private DNS
  private_cluster_public_fqdn_enabled = false      # Disable public FQDN

  # Optional: custom private DNS zone (for more control)
  # private_dns_zone_id = azurerm_private_dns_zone.aks.id  # Requires user-assigned identity and role assignments

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
    service_cidr      = "10.200.0.0/16"
    dns_service_ip    = "10.200.0.10"
  }

  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  tags = {
    Name        = "${var.project_name}-aks-private"
    Environment = var.environment
  }
}
```

## Step 2: Custom Private DNS Zone

```hcl
# Create custom private DNS zone for the API server
# Custom private DNS requires a user-assigned identity with DNS and network permissions.

resource "azurerm_user_assigned_identity" "aks" {
  name                = "${var.project_name}-aks-private-dns"
  location            = var.location
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone" "aks" {
  name                = "privatelink.${replace(lower(var.location), " ", "")}.azmk8s.io"
  resource_group_name = var.resource_group_name
}

# Link to AKS VNet
resource "azurerm_private_dns_zone_virtual_network_link" "aks" {
  name                  = "aks-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.aks.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
}

# Link to admin/management VNet for kubectl access
resource "azurerm_private_dns_zone_virtual_network_link" "admin" {
  name                  = "admin-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.aks.name
  virtual_network_id    = var.admin_vnet_id
  registration_enabled  = false
}

resource "azurerm_role_assignment" "aks_dns" {
  scope                = azurerm_private_dns_zone.aks.id
  role_definition_name = "Private DNS Zone Contributor"
  principal_id         = azurerm_user_assigned_identity.aks.principal_id
}

resource "azurerm_role_assignment" "aks_network" {
  scope                = var.vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.aks.principal_id
}

resource "azurerm_kubernetes_cluster" "private_custom_dns" {
  name                = "${var.project_name}-aks-private"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.project_name}-private"

  default_node_pool {
    name           = "system"
    vm_size        = "Standard_D4s_v3"
    node_count     = 3
    vnet_subnet_id = var.aks_subnet_id
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.aks.id]
  }

  private_cluster_enabled             = true
  private_dns_zone_id                 = azurerm_private_dns_zone.aks.id  # Custom zone
  private_cluster_public_fqdn_enabled = false

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }

  depends_on = [
    azurerm_role_assignment.aks_dns,
    azurerm_role_assignment.aks_network
  ]
}
```

## Step 3: Jump Box for Cluster Access

```hcl
# Admin VM in the same VNet for kubectl access
resource "azurerm_linux_virtual_machine" "jumpbox" {
  name                = "${var.project_name}-jumpbox"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_B2s"

  network_interface_ids           = [azurerm_network_interface.jumpbox.id]
  admin_username                  = "azureuser"
  disable_password_authentication = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  # Install kubectl and az cli via cloud-init
  custom_data = base64encode(<<-EOT
    #!/bin/bash
    apt-get update
    apt-get install -y ca-certificates curl
    curl -sL https://aka.ms/InstallAzureCLIDeb | bash
    az aks install-cli \
      --install-location /usr/local/bin/kubectl \
      --kubelogin-install-location /usr/local/bin/kubelogin
  EOT
  )

  identity {
    type = "SystemAssigned"
  }
}
```

## Step 4: CI/CD with Private Cluster

```hcl
# Self-hosted runner subnet for GitHub Actions/Azure DevOps
resource "azurerm_subnet" "cicd_runner" {
  name                 = "cicd-runner-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet_name
  address_prefixes     = ["10.0.10.0/24"]
}
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

# Use Bastion to connect to jumpbox, then run from a machine that can reach the private endpoint:
kubectl get nodes

# Run one-off troubleshooting commands through the AKS Run Command control plane
az aks command invoke \
  --resource-group <rg> \
  --name <cluster-name> \
  --command "kubectl get nodes"
```

## Conclusion

The `az aks command invoke` command allows running one-off `kubectl` or `helm` commands against private clusters through the Azure control plane without requiring direct network connectivity to the private endpoint. This is useful for troubleshooting or emergency access, but not for ongoing programmatic access. For ongoing CI/CD, deploy self-hosted GitHub Actions runners or Azure DevOps agents within the VNet or a connected network. Using `private_dns_zone_id = "System"` is the simplest configuration-Azure manages the private DNS zone automatically; use a custom zone when you need to manage DNS links and permissions yourself, such as in hub-and-spoke or custom DNS environments.
