# How to Set Up Azure VM Proximity Placement Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Proximity Placement Groups, Low Latency, HPC, Virtual Machine, Infrastructure as Code

Description: Learn how to configure Azure Proximity Placement Groups with OpenTofu to co-locate VMs within the same Azure datacenter for ultra-low network latency between application tiers.

## Introduction

Azure Proximity Placement Groups (PPGs) ensure that VMs are placed in the same Azure datacenter to minimize network latency between them. This is essential for high-performance computing (HPC), tightly-coupled applications where microseconds matter, and multi-tier applications where database, application, and cache servers need maximum proximity. PPGs work with individual VMs, Availability Sets, and VM Scale Sets. They can also be used with Availability Zones, but a single PPG cannot span zones.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A Resource Group and Virtual Network

## Step 1: Create Proximity Placement Group

```hcl
resource "azurerm_proximity_placement_group" "main" {
  name                = "${var.project_name}-ppg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = {
    Name        = "${var.project_name}-ppg"
    Environment = var.environment
    Purpose     = "low-latency-cluster"
  }
}
```

## Step 2: Deploy VMs into the PPG

```hcl
# Application server

resource "azurerm_linux_virtual_machine" "app" {
  name                = "${var.project_name}-app-vm"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D4s_v3"

  proximity_placement_group_id = azurerm_proximity_placement_group.main.id

  network_interface_ids           = [azurerm_network_interface.app.id]
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

# Database server - same PPG for low-latency app<->db communication
resource "azurerm_linux_virtual_machine" "db" {
  name                = "${var.project_name}-db-vm"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D8s_v3"

  proximity_placement_group_id = azurerm_proximity_placement_group.main.id

  network_interface_ids           = [azurerm_network_interface.db.id]
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

## Step 3: PPG with Availability Set

```hcl
# Combine PPG with Availability Set for HA within the same datacenter
resource "azurerm_availability_set" "ppg" {
  name                         = "${var.project_name}-ppg-avset"
  location                     = var.location
  resource_group_name          = var.resource_group_name
  proximity_placement_group_id = azurerm_proximity_placement_group.main.id
  managed                      = true

  # Fault domain limits vary by region; this example uses 2
  platform_fault_domain_count  = 2
  platform_update_domain_count = 5
}

resource "azurerm_linux_virtual_machine" "ha_app" {
  count = 2

  name                         = "${var.project_name}-ha-vm-${count.index + 1}"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  size                         = "Standard_D4s_v3"
  availability_set_id          = azurerm_availability_set.ppg.id

  network_interface_ids           = [azurerm_network_interface.ha[count.index].id]
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

## Step 4: PPG with VM Scale Set

```hcl
resource "azurerm_linux_virtual_machine_scale_set" "ppg" {
  name                         = "${var.project_name}-ppg-vmss"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  sku                          = "Standard_D2s_v3"
  instances                    = 3
  proximity_placement_group_id = azurerm_proximity_placement_group.main.id

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

  network_interface {
    name    = "primary"
    primary = true

    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = var.subnet_id
    }
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check PPG membership
az ppg show \
  --resource-group <rg> \
  --name <ppg-name> \
  --include-colocation-status

# Measure latency between VMs in PPG
# From app VM: ping <db-vm-private-ip> -c 100
```

## Conclusion

PPGs are a colocation constraint for the same datacenter, which can limit capacity during high-demand periods. If Azure cannot place a new VM in the PPG, the deployment can fail. To reduce that risk, specify the required VM sizes up front when possible; if a deployment fails, retry with the VM size that failed deployed first. PPGs do not guarantee network bandwidth between VMs; use Accelerated Networking (`accelerated_networking_enabled = true` on supported NICs) together with appropriately sized VMs to improve networking performance. PPGs can reduce VM-to-VM latency for tightly coupled workloads, which matters for applications doing thousands of internal round-trips per request.
