# How to Create Azure Proximity Placement Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Proximity Placement Groups, Low Latency, Infrastructure as Code, High Performance Computing

Description: Learn how to create Azure Proximity Placement Groups in Terraform to co-locate virtual machines for low-latency networking in performance-sensitive workloads.

---

Some workloads cannot tolerate even a few milliseconds of network latency between VMs. Database clusters, high-performance computing nodes, and real-time analytics systems all benefit from having their VMs physically close to each other. Azure Proximity Placement Groups (PPGs) address this by ensuring that your VMs are placed as close together as possible within an Azure data center.

This guide covers creating and using Proximity Placement Groups with Terraform, along with strategies for combining them with availability sets and scale sets.

## What Proximity Placement Groups Do

When you create VMs without a proximity placement group, Azure places them wherever capacity is available. Two VMs in the same region might end up in different buildings, adding network latency. A proximity placement group is a logical constraint that tells Azure to place resources as close together as possible, ideally in the same network spine or even the same rack.

The result is lower network latency between VMs. For workloads like distributed databases where nodes communicate constantly, this can make a significant difference in performance.

## Trade-offs to Consider

Proximity placement groups improve latency but come with trade-offs:

- **Reduced availability**: Placing VMs close together means a localized failure affects more of your workload. This is the opposite of what availability sets and zones do.
- **Capacity constraints**: Asking Azure to place all your VMs in the same physical location may fail if there is not enough capacity in that specific area.
- **Deployment order matters**: The first VM you deploy anchors the placement group to a specific location. If you later need a VM size that is not available in that location, you may need to deallocate and redeploy.

Use proximity placement groups only when low latency is a genuine requirement, not as a default.

## Creating a Proximity Placement Group

The Terraform resource is simple:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

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

# Resource group
resource "azurerm_resource_group" "hpc" {
  name     = "rg-hpc-prod-eastus"
  location = "East US"
}

# Proximity placement group
resource "azurerm_proximity_placement_group" "main" {
  name                = "ppg-hpc-cluster"
  location            = azurerm_resource_group.hpc.location
  resource_group_name = azurerm_resource_group.hpc.name

  # Allowed types control which resources can use this PPG
  allowed_vm_sizes = [
    "Standard_D4s_v5",
    "Standard_D8s_v5",
    "Standard_D16s_v5",
  ]

  tags = {
    environment = "production"
    workload    = "hpc-cluster"
    managed_by  = "terraform"
  }
}
```

The `allowed_vm_sizes` parameter is optional but useful. It restricts which VM sizes can be added to the placement group, preventing someone from accidentally adding a VM size that forces the group to a different physical location.

## Placing VMs in a Proximity Placement Group

Reference the PPG ID when creating your VMs:

```hcl
# Network interfaces for HPC cluster nodes
resource "azurerm_network_interface" "hpc" {
  count               = 4
  name                = "nic-hpc-node-${count.index + 1}"
  location            = azurerm_resource_group.hpc.location
  resource_group_name = azurerm_resource_group.hpc.name

  # Enable accelerated networking for lower latency
  enable_accelerated_networking = true

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.hpc.id
    private_ip_address_allocation = "Dynamic"
  }
}

# HPC cluster nodes placed in the proximity placement group
resource "azurerm_linux_virtual_machine" "hpc" {
  count               = 4
  name                = "vm-hpc-node-${count.index + 1}"
  location            = azurerm_resource_group.hpc.location
  resource_group_name = azurerm_resource_group.hpc.name
  size                = "Standard_D8s_v5"

  # Place the VM in the proximity placement group
  proximity_placement_group_id = azurerm_proximity_placement_group.main.id

  admin_username = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  network_interface_ids = [
    azurerm_network_interface.hpc[count.index].id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  tags = {
    cluster = "hpc"
    node    = count.index + 1
  }
}
```

Notice the `enable_accelerated_networking = true` on the network interfaces. This is critical for low-latency workloads because it bypasses the host network stack and sends traffic directly to the NIC hardware.

## Combining PPG with Availability Sets

You can use both proximity placement groups and availability sets together. The availability set provides fault and update domain separation, while the PPG keeps the VMs physically close:

```hcl
# Availability set within the proximity placement group
resource "azurerm_availability_set" "db_cluster" {
  name                         = "avset-db-cluster"
  location                     = azurerm_resource_group.hpc.location
  resource_group_name          = azurerm_resource_group.hpc.name
  platform_fault_domain_count  = 2
  platform_update_domain_count = 5
  managed                      = true

  # Link the availability set to the proximity placement group
  proximity_placement_group_id = azurerm_proximity_placement_group.main.id

  tags = {
    workload = "database-cluster"
  }
}

# Database VMs get both PPG proximity and availability set protection
resource "azurerm_linux_virtual_machine" "db" {
  count               = 3
  name                = "vm-db-node-${count.index + 1}"
  location            = azurerm_resource_group.hpc.location
  resource_group_name = azurerm_resource_group.hpc.name
  size                = "Standard_D16s_v5"

  # Both the availability set and the PPG are specified
  availability_set_id          = azurerm_availability_set.db_cluster.id
  proximity_placement_group_id = azurerm_proximity_placement_group.main.id

  admin_username = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  network_interface_ids = [
    azurerm_network_interface.db[count.index].id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}
```

When you combine these, Azure puts all VMs as close together as possible while still distributing them across fault domains. The fault domains will be within the same physical cluster, so latency stays low.

## Using PPG with Virtual Machine Scale Sets

For auto-scaling workloads that also need low latency:

```hcl
# Scale set with proximity placement group
resource "azurerm_linux_virtual_machine_scale_set" "workers" {
  name                = "vmss-workers"
  location            = azurerm_resource_group.hpc.location
  resource_group_name = azurerm_resource_group.hpc.name
  sku                 = "Standard_D4s_v5"
  instances           = 4

  # Place scale set instances in the proximity placement group
  proximity_placement_group_id = azurerm_proximity_placement_group.main.id

  admin_username = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  network_interface {
    name                          = "nic-worker"
    primary                       = true
    enable_accelerated_networking = true

    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = azurerm_subnet.hpc.id
    }
  }
}
```

## Managing Multiple PPGs

For complex deployments with different latency-sensitive workloads, create separate PPGs:

```hcl
# Define placement groups for different workload tiers
locals {
  placement_groups = {
    "compute" = {
      name = "ppg-compute-cluster"
      tags = { workload = "compute" }
    }
    "storage" = {
      name = "ppg-storage-cluster"
      tags = { workload = "storage" }
    }
    "network" = {
      name = "ppg-network-functions"
      tags = { workload = "network" }
    }
  }
}

resource "azurerm_proximity_placement_group" "groups" {
  for_each = local.placement_groups

  name                = each.value.name
  location            = azurerm_resource_group.hpc.location
  resource_group_name = azurerm_resource_group.hpc.name
  tags                = merge(each.value.tags, { managed_by = "terraform" })
}
```

## Deployment Strategy

The order in which you deploy VMs into a PPG matters. The first VM you create anchors the placement group to a physical location. Here is a practical approach:

1. Create the PPG first
2. Deploy the largest VM size you need first - this anchors the group to a location that can support that size
3. Deploy smaller VMs after - they will fit anywhere the large VM fits
4. If deployment fails due to capacity, deallocate all VMs, then redeploy starting with the anchor VM

## Wrapping Up

Proximity Placement Groups are a targeted tool for specific workloads that need low network latency. They work well for HPC clusters, distributed databases, and real-time processing pipelines. Combine them with availability sets when you need both proximity and fault domain protection. Just remember that proximity comes at the cost of reduced blast radius protection, so only use PPGs when the latency benefit justifies the trade-off.

For more on VM placement strategies, see [How to Create Azure Availability Sets in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-availability-sets-in-terraform/view).
