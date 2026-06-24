# How to Create Azure Bastion Host with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Bastion Host, Secure Access, RDP, SSH, Zero Trust, Infrastructure as Code

Description: Learn how to deploy Azure Bastion Host with OpenTofu to provide secure browser-based RDP and SSH access to VMs without exposing public IPs or opening inbound ports.

## Introduction

Azure Bastion is a managed PaaS service that provides secure RDP and SSH access to VMs through the Azure Portal or native clients over TLS, without requiring a public IP on the VM or exposing RDP/SSH ports to the public internet. Traffic flows through Azure's network, and Bastion brokers the session. With Microsoft Entra ID authentication, you can enforce MFA and Conditional Access policies, and Premium SKU adds session recording for compliance scenarios. This eliminates the attack surface of publicly exposed management ports, which are a primary target for brute-force attacks.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- Azure CLI 2.62.0+ (for the `az network bastion` native client commands)
- A Virtual Network with a dedicated `AzureBastionSubnet` subnet (/26 or larger)

## Step 1: Create AzureBastionSubnet and Bastion Host

```hcl
# Dedicated subnet - must be named exactly "AzureBastionSubnet"

resource "azurerm_subnet" "bastion" {
  name                 = "AzureBastionSubnet"  # Required exact name
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet_name
  address_prefixes     = ["10.0.255.0/26"]  # /26 minimum for Bastion
}

resource "azurerm_public_ip" "bastion" {
  name                = "${var.project_name}-bastion-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"  # Standard required for Bastion
}

resource "azurerm_bastion_host" "main" {
  name                = "${var.project_name}-bastion"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"  # Standard or Premium required for the advanced features below

  # Standard/Premium SKU features
  copy_paste_enabled     = true
  file_copy_enabled      = true   # Standard/Premium only
  tunneling_enabled      = true   # Standard/Premium only - enables native RDP/SSH clients
  shareable_link_enabled = true   # Standard/Premium only - generate shareable links
  ip_connect_enabled     = true   # Standard/Premium only - connect to IP addresses

  ip_configuration {
    name                 = "configuration"
    subnet_id            = azurerm_subnet.bastion.id
    public_ip_address_id = azurerm_public_ip.bastion.id
  }

  tags = {
    Name = "${var.project_name}-bastion"
  }
}
```

## Step 2: NSG for AzureBastionSubnet

If you apply an NSG to `AzureBastionSubnet`, include all required ingress and egress rules. If the target VM subnet also has an NSG, allow inbound `22`/`3389` from the `AzureBastionSubnet` address range.

```hcl
resource "azurerm_network_security_group" "bastion" {
  name                = "${var.project_name}-bastion-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Allow HTTPS from internet (for browser-based access)
  security_rule {
    name                       = "allow-https-inbound"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # Required: allow Azure infrastructure communication
  security_rule {
    name                       = "allow-gateway-manager"
    priority                   = 130
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "GatewayManager"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-azure-load-balancer"
    priority                   = 140
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-bastion-host-communication"
    priority                   = 150
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_ranges    = ["8080", "5701"]
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "VirtualNetwork"
  }

  # Allow Bastion to reach target VM private IPs
  security_rule {
    name                       = "allow-ssh-rdp-outbound"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_ranges    = ["22", "3389"]
    source_address_prefix      = "*"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "allow-bastion-communication"
    priority                   = 160
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_ranges    = ["8080", "5701"]
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "allow-azure-cloud-outbound"
    priority                   = 170
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "AzureCloud"
  }

  security_rule {
    name                       = "allow-http-outbound"
    priority                   = 180
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "Internet"
  }
}

resource "azurerm_subnet_network_security_group_association" "bastion" {
  subnet_id                 = azurerm_subnet.bastion.id
  network_security_group_id = azurerm_network_security_group.bastion.id
}
```

## Step 3: VMs Without Public IPs

```hcl
# VMs accessed through Bastion - no public IP needed
resource "azurerm_linux_virtual_machine" "private" {
  name                = "${var.project_name}-private-vm"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D2s_v3"

  network_interface_ids           = [azurerm_network_interface.private.id]
  admin_username                  = "azureuser"
  disable_password_authentication = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }
}

resource "azurerm_network_interface" "private" {
  name                = "${var.project_name}-private-nic"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.vm_subnet_id
    private_ip_address_allocation = "Dynamic"
    # No public_ip_address_id - accessed via Bastion
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Connect via Azure CLI with native client tunneling (Standard or Premium SKU)
az network bastion ssh \
  --name <bastion-name> \
  --resource-group <rg> \
  --target-resource-id <vm-id> \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa

# RDP tunnel to a Windows VM
az network bastion rdp \
  --name <bastion-name> \
  --resource-group <rg> \
  --target-resource-id <vm-id>
```

## Conclusion

Azure Bastion eliminates the need for jump boxes, VPNs, or public IPs on management VMs. The Standard or Premium SKU is required for native client (SSH/RDP) support via tunneling. Basic SKU only supports browser-based access through the Azure Portal. One Bastion deployment can access VMs in its VNet and in peered VNets. Combine Bastion with Microsoft Entra ID authentication and Conditional Access policies to enforce MFA for supported VM access scenarios.
