# How to Create Azure Bastion Host in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Bastion, Security, Infrastructure as Code, Remote Access

Description: Learn how to deploy Azure Bastion with Terraform for secure RDP and SSH access to virtual machines without exposing them to the public internet.

---

Azure Bastion provides secure and seamless RDP and SSH connectivity to your virtual machines directly through the Azure portal or native clients, without needing public IP addresses on your VMs. Instead of opening RDP port 3389 or SSH port 22 to the internet and hoping your firewall rules hold up, Bastion gives you a hardened jump box that Microsoft manages.

This is a significant security improvement over traditional approaches like public IPs with NSG rules or self-managed jump boxes. Bastion terminates the connection at the Azure edge, provisions a TLS session from your browser, and connects to the target VM over the private network. Your VMs never need to be directly reachable from the internet.

## How Azure Bastion Works

When you deploy Bastion into a virtual network, it creates a managed service in a dedicated subnet called `AzureBastionSubnet`. When you want to connect to a VM, you go through the Azure portal (or use the native client), and Bastion establishes a secure tunnel. The traffic flows like this:

1. Your browser connects to the Bastion public endpoint over HTTPS (port 443)
2. Bastion establishes an RDP or SSH session to the target VM over the private network
3. The VM only needs a private IP address - no public IP required

## SKU Options

Azure Bastion comes in three tiers:

- **Basic** - browser-based RDP/SSH, manual scaling
- **Standard** - adds native client support, IP-based connections, file transfers, shareable links, and custom port support
- **Premium** - adds session recording and private-only deployment

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Creating a Basic Bastion Host

```hcl
resource "azurerm_resource_group" "bastion" {
  name     = "rg-bastion-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Virtual network where Bastion will be deployed
resource "azurerm_virtual_network" "main" {
  name                = "vnet-prod-eastus-001"
  location            = azurerm_resource_group.bastion.location
  resource_group_name = azurerm_resource_group.bastion.name
  address_space       = ["10.0.0.0/16"]

  tags = {
    Environment = "Production"
  }
}

# Bastion requires a dedicated subnet named exactly "AzureBastionSubnet"
# Minimum size is /26 for Basic/Standard, recommended /26 or larger
resource "azurerm_subnet" "bastion" {
  name                 = "AzureBastionSubnet"
  resource_group_name  = azurerm_resource_group.bastion.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.255.0/26"]
}

# Workload subnet for VMs
resource "azurerm_subnet" "workload" {
  name                 = "snet-workload"
  resource_group_name  = azurerm_resource_group.bastion.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Public IP for the Bastion host
resource "azurerm_public_ip" "bastion" {
  name                = "pip-bastion-prod"
  location            = azurerm_resource_group.bastion.location
  resource_group_name = azurerm_resource_group.bastion.name

  # Bastion requires Standard SKU and Static allocation
  allocation_method = "Static"
  sku               = "Standard"

  tags = {
    Environment = "Production"
  }
}

# Create the Bastion host
resource "azurerm_bastion_host" "main" {
  name                = "bas-prod-eastus-001"
  location            = azurerm_resource_group.bastion.location
  resource_group_name = azurerm_resource_group.bastion.name

  # Basic tier for simple browser-based access
  sku = "Basic"

  ip_configuration {
    name                 = "bastion-ip-config"
    subnet_id            = azurerm_subnet.bastion.id
    public_ip_address_id = azurerm_public_ip.bastion.id
  }

  tags = {
    Environment = "Production"
  }
}
```

## Standard Tier with Advanced Features

```hcl
# Standard tier Bastion with native client support and scaling
resource "azurerm_bastion_host" "standard" {
  name                = "bas-standard-prod-001"
  location            = azurerm_resource_group.bastion.location
  resource_group_name = azurerm_resource_group.bastion.name

  # Standard tier enables advanced features
  sku = "Standard"

  # Scale units for throughput (2-50, default 2)
  # Each unit supports approximately 20 concurrent RDP and 40 concurrent SSH sessions
  scale_units = 4

  # Enable native client support (az network bastion rdp/ssh commands)
  tunneling_enabled = true

  # Enable IP-based connection (connect to VMs by IP, not just resource ID)
  ip_connect_enabled = true

  # Enable file copy through Bastion
  file_copy_enabled = true

  # Enable shareable links (generate URLs for VM access)
  shareable_link_enabled = true

  # Copy/paste functionality
  copy_paste_enabled = true

  ip_configuration {
    name                 = "bastion-ip-config"
    subnet_id            = azurerm_subnet.bastion.id
    public_ip_address_id = azurerm_public_ip.bastion.id
  }

  tags = {
    Environment = "Production"
    Tier        = "Standard"
  }
}
```

## Creating a Test VM to Connect Through Bastion

```hcl
# Network interface for the VM (private IP only, no public IP needed)
resource "azurerm_network_interface" "vm" {
  name                = "nic-vm-test-001"
  location            = azurerm_resource_group.bastion.location
  resource_group_name = azurerm_resource_group.bastion.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.workload.id
    private_ip_address_allocation = "Dynamic"
    # Note: No public IP address assigned
  }
}

# NSG for the workload subnet
resource "azurerm_network_security_group" "workload" {
  name                = "nsg-workload-prod"
  location            = azurerm_resource_group.bastion.location
  resource_group_name = azurerm_resource_group.bastion.name

  # Allow RDP from the Bastion subnet
  security_rule {
    name                       = "AllowBastionRDP"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3389"
    source_address_prefix      = "10.0.255.0/26" # Bastion subnet
    destination_address_prefix = "*"
  }

  # Allow SSH from the Bastion subnet
  security_rule {
    name                       = "AllowBastionSSH"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "10.0.255.0/26" # Bastion subnet
    destination_address_prefix = "*"
  }

  # Deny all other inbound
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "workload" {
  subnet_id                 = azurerm_subnet.workload.id
  network_security_group_id = azurerm_network_security_group.workload.id
}

# Linux VM accessible only through Bastion
resource "azurerm_linux_virtual_machine" "test" {
  name                            = "vm-test-001"
  resource_group_name             = azurerm_resource_group.bastion.name
  location                        = azurerm_resource_group.bastion.location
  size                            = "Standard_B2s"
  admin_username                  = "adminuser"
  admin_password                  = var.vm_admin_password
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.vm.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  tags = {
    Environment = "Production"
  }
}

variable "vm_admin_password" {
  type      = string
  sensitive = true
}
```

## NSG Rules for the Bastion Subnet

Azure Bastion requires specific NSG rules on the AzureBastionSubnet:

```hcl
# NSG for the Bastion subnet with required rules
resource "azurerm_network_security_group" "bastion" {
  name                = "nsg-bastion-prod"
  location            = azurerm_resource_group.bastion.location
  resource_group_name = azurerm_resource_group.bastion.name

  # Inbound: Allow HTTPS from Internet (for user connections)
  security_rule {
    name                       = "AllowHttpsInbound"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # Inbound: Allow Gateway Manager (for control plane)
  security_rule {
    name                       = "AllowGatewayManagerInbound"
    priority                   = 130
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "GatewayManager"
    destination_address_prefix = "*"
  }

  # Inbound: Allow Azure Load Balancer
  security_rule {
    name                       = "AllowAzureLoadBalancerInbound"
    priority                   = 140
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }

  # Outbound: Allow SSH to Virtual Network
  security_rule {
    name                       = "AllowSshOutbound"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "VirtualNetwork"
  }

  # Outbound: Allow RDP to Virtual Network
  security_rule {
    name                       = "AllowRdpOutbound"
    priority                   = 110
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3389"
    source_address_prefix      = "*"
    destination_address_prefix = "VirtualNetwork"
  }

  # Outbound: Allow HTTPS to Azure Cloud (for diagnostics)
  security_rule {
    name                       = "AllowAzureCloudOutbound"
    priority                   = 120
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "AzureCloud"
  }

  tags = {
    Environment = "Production"
  }
}

resource "azurerm_subnet_network_security_group_association" "bastion" {
  subnet_id                 = azurerm_subnet.bastion.id
  network_security_group_id = azurerm_network_security_group.bastion.id
}
```

## Diagnostic Settings

```hcl
resource "azurerm_log_analytics_workspace" "monitoring" {
  name                = "law-bastion-prod"
  location            = azurerm_resource_group.bastion.location
  resource_group_name = azurerm_resource_group.bastion.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_monitor_diagnostic_setting" "bastion" {
  name                       = "diag-bastion-to-law"
  target_resource_id         = azurerm_bastion_host.standard.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.monitoring.id

  enabled_log {
    category = "BastionAuditLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Outputs

```hcl
output "bastion_dns_name" {
  description = "Bastion host DNS name"
  value       = azurerm_bastion_host.standard.dns_name
}

output "bastion_id" {
  description = "Bastion host resource ID"
  value       = azurerm_bastion_host.standard.id
}

output "bastion_public_ip" {
  description = "Bastion public IP address"
  value       = azurerm_public_ip.bastion.ip_address
}
```

## Best Practices

**Use Standard tier for production.** The Standard tier adds native client support (SSH/RDP from your local terminal), file transfer, IP-based connections, and scaling. These features are almost always needed in production.

**Size the subnet appropriately.** The minimum subnet size is /26 (64 addresses), but use /26 as a baseline. Each scale unit uses some of these addresses, so if you plan to scale up, consider /25 or /24.

**Scale based on concurrent sessions.** Each scale unit supports roughly 20 concurrent RDP sessions and 40 concurrent SSH sessions. Calculate your peak usage and set scale units accordingly.

**Enable audit logging.** Bastion audit logs capture who connected to which VM and when. This is essential for security compliance and incident investigation.

**Remove public IPs from VMs.** The whole point of Bastion is eliminating the need for public IPs on VMs. Audit your environment regularly to ensure no VMs have unnecessary public IP addresses.

**Use NSG rules on both subnets.** Apply the required Bastion NSG rules on AzureBastionSubnet, and restrict the workload subnet to only allow RDP/SSH from the Bastion subnet.

## Conclusion

Azure Bastion with Terraform provides a clean, secure approach to VM remote access. By eliminating public IPs on VMs and routing all management traffic through a managed jump box, you significantly reduce your attack surface. Terraform makes it straightforward to deploy Bastion consistently across environments, with the right NSG rules, diagnostic settings, and scaling configuration from day one.
