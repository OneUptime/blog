# How to Create Linux Virtual Machines with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Linux, Virtual Machine, Compute, SSH, Infrastructure as Code

Description: Learn how to create and configure Linux virtual machines on Azure with OpenTofu, including SSH key authentication, managed disks, and cloud-init customization.

## Introduction

Azure Linux Virtual Machines provide flexible compute with support for most major Linux distributions including Ubuntu, RHEL, CentOS, Debian, and SUSE. With `azurerm_linux_virtual_machine` and related AzureRM resources, you can manage the VM, network interfaces, managed OS disks, data disks, and VM extensions. SSH key authentication is the recommended approach for secure access without password exposure.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured (service principal or managed identity)
- An Azure Resource Group and Virtual Network with subnet
- An SSH key pair for VM access

## Step 1: Create the Linux VM

```hcl
resource "azurerm_linux_virtual_machine" "main" {
  name                = "${var.project_name}-vm"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D2s_v3"

  # Network interface
  network_interface_ids = [azurerm_network_interface.main.id]

  # Authentication - SSH key only (disable password)
  admin_username                  = "azureuser"
  disable_password_authentication = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  # OS disk
  os_disk {
    name                 = "${var.project_name}-os-disk"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 64
  }

  # OS image
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  # Cloud-init for initial configuration
  custom_data = base64encode(file("${path.module}/cloud-init.yaml"))

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Name        = "${var.project_name}-vm"
    Environment = var.environment
  }
}
```

## Step 2: Create Network Interface

```hcl
resource "azurerm_network_interface" "main" {
  name                = "${var.project_name}-nic"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.main.id
  }
}

resource "azurerm_public_ip" "main" {
  name                = "${var.project_name}-pip"
  resource_group_name = var.resource_group_name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_security_group" "main" {
  name                = "${var.project_name}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "allow-ssh"
    priority                   = 1000
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface_security_group_association" "main" {
  network_interface_id      = azurerm_network_interface.main.id
  network_security_group_id = azurerm_network_security_group.main.id
}

output "public_ip_address" {
  value = azurerm_public_ip.main.ip_address
}
```

## Step 3: Attach Data Disks

```hcl
resource "azurerm_managed_disk" "data" {
  name                 = "${var.project_name}-data-disk"
  location             = var.location
  resource_group_name  = var.resource_group_name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 256
}

resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.main.id
  lun                = 0
  caching            = "ReadWrite"
}
```

## Step 4: cloud-init.yaml

```yaml
#cloud-config
package_update: true
packages:
  - nginx
  - curl
  - jq
runcmd:
  - systemctl enable nginx
  - systemctl start nginx
  - echo "Hello from $(hostname)" > /var/www/html/index.html
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Connect to the VM

ssh azureuser@$(tofu output -raw public_ip_address)

# Check cloud-init status
ssh azureuser@$(tofu output -raw public_ip_address) "sudo cloud-init status --wait"
```

## Conclusion

Use `disable_password_authentication = true` with SSH keys for all Linux VMs in production, and pair Standard public IPs with NSG rules that explicitly allow only the ports you need. Set `storage_account_type = "Premium_LRS"` for OS disks on production workloads to get better IOPS. Use the `identity { type = "SystemAssigned" }` block to enable managed identity, which allows the VM to authenticate to Azure services like Key Vault without storing credentials.
