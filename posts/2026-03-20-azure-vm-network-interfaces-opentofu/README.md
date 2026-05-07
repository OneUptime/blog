# How to Configure Azure VM Network Interfaces with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Network Interfaces, NIC, Accelerated Networking, VMs, Infrastructure as Code

Description: Learn how to configure Azure VM Network Interfaces with OpenTofu, including multiple NICs, accelerated networking, IP forwarding, and static private IP assignments.

## Introduction

Azure Network Interfaces (NICs) connect VMs to Virtual Networks and control network settings including IP addresses, DNS servers, network security groups, and accelerated networking. A VM can have multiple NICs for network segmentation (e.g., separating management, application, and storage traffic). Accelerated Networking uses SR-IOV so most packets go directly between the guest and the physical NIC, reducing latency and CPU utilization while improving throughput.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A Virtual Network with subnets

## Step 1: Basic Network Interface

```hcl
resource "azurerm_network_interface" "main" {
  name                = "${var.project_name}-nic"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Enable Accelerated Networking (requires supported VM size)
  accelerated_networking_enabled = true

  # Enable IP forwarding for network appliances (NVAs, routers)
  ip_forwarding_enabled = false

  ip_configuration {
    name                          = "primary"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.1.10"  # Static IP for server roles
    primary                       = true

    # Associate public IP (for internet-facing VMs)
    public_ip_address_id = azurerm_public_ip.main.id
  }

  # Custom DNS servers (override VNet DNS)
  dns_servers = ["10.0.0.4", "10.0.0.5"]

  tags = {
    Name = "${var.project_name}-primary-nic"
  }
}
```

## Step 2: Multiple IP Configurations per NIC

```hcl
resource "azurerm_network_interface" "multi_ip" {
  name                = "${var.project_name}-multi-ip-nic"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Primary IP configuration
  ip_configuration {
    name                          = "primary"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    primary                       = true
  }

  # Secondary IP configurations (e.g., for hosting multiple websites)
  ip_configuration {
    name                          = "secondary-1"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.1.11"
    primary                       = false
  }

  ip_configuration {
    name                          = "secondary-2"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.1.12"
    primary                       = false
  }
}
```

## Step 3: Multiple NICs for Network Segmentation

```hcl
# NIC on management subnet

resource "azurerm_network_interface" "management" {
  name                          = "${var.project_name}-mgmt-nic"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  accelerated_networking_enabled = true

  ip_configuration {
    name                          = "mgmt"
    subnet_id                     = var.management_subnet_id
    private_ip_address_allocation = "Dynamic"
    primary                       = true
  }
}

# NIC on application subnet
resource "azurerm_network_interface" "application" {
  name                          = "${var.project_name}-app-nic"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  accelerated_networking_enabled = true

  ip_configuration {
    name                          = "app"
    subnet_id                     = var.application_subnet_id
    private_ip_address_allocation = "Dynamic"
    primary                       = true
  }
}

# VM with multiple NICs (first NIC is primary)
resource "azurerm_linux_virtual_machine" "multi_nic" {
  name                = "${var.project_name}-multi-nic-vm"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D4s_v3"  # Must support multiple NICs

  network_interface_ids = [
    azurerm_network_interface.management.id,   # Primary NIC (index 0)
    azurerm_network_interface.application.id,  # Secondary NIC
  ]

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
```

## Step 4: Associate NSG with NIC

```hcl
resource "azurerm_network_security_group" "app" {
  name                = "${var.project_name}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "allow-https"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface_security_group_association" "app" {
  network_interface_id      = azurerm_network_interface.main.id
  network_security_group_id = azurerm_network_security_group.app.id
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check effective security rules
az network nic list-effective-nsg \
  --resource-group <rg> \
  --name <nic-name>

# Check effective routes
az network nic show-effective-route-table \
  --resource-group <rg> \
  --name <nic-name>
```

## Conclusion

Enable `accelerated_networking_enabled = true` on NICs for production VMs that use a supported VM size and guest OS. Microsoft documents lower latency, lower jitter, and reduced CPU utilization because most packets bypass the host virtual switch. The maximum number of NICs per VM depends on the VM size; check `az vm list-skus` for the `MaxNetworkInterfaces` capability. When using multiple NICs, Azure uses the primary NIC for default outbound traffic, so configure routing rules inside the guest OS (using `ip route` on Linux) when traffic must return through a specific NIC.
