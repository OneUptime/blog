# How to Set Up Azure VM Availability Sets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Availability Sets, High Availability, Fault Domains, Update Domains, Infrastructure as Code

Description: Learn how to configure Azure VM Availability Sets with OpenTofu to protect applications from hardware failures and planned maintenance by distributing VMs across fault and update domains.

## Introduction

Azure Availability Sets protect VMs against hardware failures and planned maintenance events by distributing them across fault domains (separate physical racks with independent power and network) and update domains (groups of VMs restarted together during planned maintenance). Using two or more VMs in an Availability Set helps meet the 99.95% Azure SLA. For cloud-native workloads, Availability Zones provide stronger guarantees, but Availability Sets remain important for lift-and-shift migrations and workloads requiring specific VM proximity.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A Resource Group and Virtual Network

## Step 1: Create Availability Set

```hcl
resource "azurerm_availability_set" "main" {
  name                         = "${var.project_name}-avset"
  location                     = var.location
  resource_group_name          = var.resource_group_name
  platform_fault_domain_count  = 2  # 2-3 depending on region
  platform_update_domain_count = 5  # 1-20, default is 5

  managed = true  # Required for managed disks

  tags = {
    Name        = "${var.project_name}-availability-set"
    Environment = var.environment
  }
}
```

## Step 2: Deploy VMs into the Availability Set

```hcl
resource "azurerm_linux_virtual_machine" "app" {
  count = var.vm_count  # Deploy multiple VMs across the availability set

  name                = "${var.project_name}-vm-${count.index + 1}"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D2s_v3"

  # Place in the availability set
  availability_set_id = azurerm_availability_set.main.id

  network_interface_ids           = [azurerm_network_interface.app[count.index].id]
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

  tags = {
    Name  = "${var.project_name}-vm-${count.index + 1}"
    Index = count.index + 1
  }
}

resource "azurerm_network_interface" "app" {
  count = var.vm_count

  name                = "${var.project_name}-nic-${count.index + 1}"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
  }
}
```

## Step 3: Associate VMs with Load Balancer Backend Pool

```hcl
resource "azurerm_public_ip" "main" {
  name                = "${var.project_name}-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_lb" "main" {
  name                = "${var.project_name}-lb"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"

  frontend_ip_configuration {
    name                 = "frontend"
    public_ip_address_id = azurerm_public_ip.main.id
  }
}

resource "azurerm_lb_backend_address_pool" "main" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "${var.project_name}-backend-pool"
}

resource "azurerm_network_interface_backend_address_pool_association" "app" {
  count = var.vm_count

  network_interface_id    = azurerm_network_interface.app[count.index].id
  ip_configuration_name   = "internal"
  backend_address_pool_id = azurerm_lb_backend_address_pool.main.id
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check availability set configuration

az vm availability-set show \
  --resource-group <rg> \
  --name <avset-name>

# Check VM fault/update domain assignments
az vm get-instance-view \
  --resource-group <rg> \
  --name <vm-name> \
  --query "{FaultDomain: platformFaultDomain, UpdateDomain: platformUpdateDomain}"
```

## Conclusion

Fault and update domain counts cannot be changed after the availability set is created-plan the architecture before deploying. You cannot mix Availability Zones and Availability Sets for the same VM. For new deployments targeting 99.99% SLA, use Availability Zones instead of Availability Sets. Availability Sets work best when you need to keep VMs in the same datacenter for low-latency communication while still protecting against rack-level failures. Always deploy at least 2 VMs in an Availability Set-a single VM provides no high availability protection.
