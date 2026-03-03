# How to Provision Talos Linux on Azure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Azure, Terraform, Kubernetes, Infrastructure as Code

Description: A complete guide to deploying Talos Linux Kubernetes clusters on Microsoft Azure using Terraform for infrastructure automation.

---

Microsoft Azure is a popular cloud platform for running Kubernetes workloads, and pairing it with Talos Linux gives you a hardened, immutable operating system that removes the complexity of traditional node management. With Terraform handling the provisioning, you get a fully automated and version-controlled workflow from start to finish. This guide covers everything you need to deploy Talos Linux on Azure with Terraform.

## Why Azure for Talos Linux?

Azure offers a rich set of managed services that complement Kubernetes deployments. From virtual machine scale sets to managed disks and Azure Load Balancer, the platform provides the building blocks you need for a production cluster. Talos Linux fits naturally into this environment because its API-driven management model aligns well with cloud automation practices.

Unlike AKS, running Talos on Azure VMs gives you full control over the Kubernetes version, the OS configuration, and the cluster lifecycle. You trade some convenience for flexibility, which is exactly what many teams need for specialized workloads or compliance requirements.

## Prerequisites

Make sure you have these tools installed and configured:

- Terraform 1.5 or later
- Azure CLI (`az`) logged in with appropriate subscription access
- `talosctl` CLI installed
- An Azure subscription with permissions to create resource groups, VMs, networks, and load balancers

## Setting Up the Terraform Provider

Start with the Azure provider configuration and a resource group:

```hcl
# main.tf - Azure provider and base resources

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource group to hold all cluster resources
resource "azurerm_resource_group" "talos" {
  name     = "${var.cluster_name}-rg"
  location = var.azure_location
}
```

## Defining Variables

```hcl
# variables.tf - Input variables for the Azure Talos deployment

variable "azure_location" {
  description = "Azure region for the deployment"
  type        = string
  default     = "eastus"
}

variable "cluster_name" {
  description = "Name of the Talos cluster"
  type        = string
  default     = "talos-cluster"
}

variable "control_plane_count" {
  description = "Number of control plane nodes"
  type        = number
  default     = 3
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "control_plane_vm_size" {
  description = "Azure VM size for control plane nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "worker_vm_size" {
  description = "Azure VM size for worker nodes"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "talos_image_id" {
  description = "Azure image ID for Talos Linux"
  type        = string
}
```

## Networking Configuration

Create a virtual network with subnets and network security groups:

```hcl
# Virtual network for the cluster
resource "azurerm_virtual_network" "talos" {
  name                = "${var.cluster_name}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.talos.location
  resource_group_name = azurerm_resource_group.talos.name
}

# Subnet for cluster nodes
resource "azurerm_subnet" "talos" {
  name                 = "${var.cluster_name}-subnet"
  resource_group_name  = azurerm_resource_group.talos.name
  virtual_network_name = azurerm_virtual_network.talos.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Network security group with rules for Talos and Kubernetes
resource "azurerm_network_security_group" "talos" {
  name                = "${var.cluster_name}-nsg"
  location            = azurerm_resource_group.talos.location
  resource_group_name = azurerm_resource_group.talos.name

  # Allow Talos API traffic
  security_rule {
    name                       = "talos-api"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "50000"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow Kubernetes API traffic
  security_rule {
    name                       = "k8s-api"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow etcd communication between control plane nodes
  security_rule {
    name                       = "etcd"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "2379-2380"
    source_address_prefix      = "10.0.1.0/24"
    destination_address_prefix = "*"
  }
}
```

## Creating the Load Balancer

Set up an Azure Load Balancer for the Kubernetes API endpoint:

```hcl
# Public IP for the load balancer
resource "azurerm_public_ip" "lb" {
  name                = "${var.cluster_name}-lb-ip"
  location            = azurerm_resource_group.talos.location
  resource_group_name = azurerm_resource_group.talos.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# Load balancer for Kubernetes API
resource "azurerm_lb" "talos" {
  name                = "${var.cluster_name}-lb"
  location            = azurerm_resource_group.talos.location
  resource_group_name = azurerm_resource_group.talos.name
  sku                 = "Standard"

  frontend_ip_configuration {
    name                 = "k8s-api-frontend"
    public_ip_address_id = azurerm_public_ip.lb.id
  }
}

# Backend pool for control plane nodes
resource "azurerm_lb_backend_address_pool" "cp" {
  loadbalancer_id = azurerm_lb.talos.id
  name            = "control-plane-pool"
}

# Health probe for port 6443
resource "azurerm_lb_probe" "k8s_api" {
  loadbalancer_id = azurerm_lb.talos.id
  name            = "k8s-api-probe"
  port            = 6443
  protocol        = "Tcp"
}

# Load balancing rule
resource "azurerm_lb_rule" "k8s_api" {
  loadbalancer_id                = azurerm_lb.talos.id
  name                           = "k8s-api-rule"
  protocol                       = "Tcp"
  frontend_port                  = 6443
  backend_port                   = 6443
  frontend_ip_configuration_name = "k8s-api-frontend"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.cp.id]
  probe_id                       = azurerm_lb_probe.k8s_api.id
}
```

## Provisioning Virtual Machines

Create the control plane and worker VMs using the Talos Linux image:

```hcl
# Network interfaces for control plane nodes
resource "azurerm_network_interface" "cp" {
  count               = var.control_plane_count
  name                = "${var.cluster_name}-cp-nic-${count.index}"
  location            = azurerm_resource_group.talos.location
  resource_group_name = azurerm_resource_group.talos.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.talos.id
    private_ip_address_allocation = "Dynamic"
  }
}

# Control plane virtual machines
resource "azurerm_linux_virtual_machine" "control_plane" {
  count               = var.control_plane_count
  name                = "${var.cluster_name}-cp-${count.index}"
  resource_group_name = azurerm_resource_group.talos.name
  location            = azurerm_resource_group.talos.location
  size                = var.control_plane_vm_size
  admin_username      = "talos"

  network_interface_ids = [
    azurerm_network_interface.cp[count.index].id
  ]

  source_image_id = var.talos_image_id

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 50
  }

  admin_ssh_key {
    username   = "talos"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  tags = {
    Role = "controlplane"
  }
}

# Worker virtual machines
resource "azurerm_linux_virtual_machine" "worker" {
  count               = var.worker_count
  name                = "${var.cluster_name}-worker-${count.index}"
  resource_group_name = azurerm_resource_group.talos.name
  location            = azurerm_resource_group.talos.location
  size                = var.worker_vm_size
  admin_username      = "talos"

  network_interface_ids = [
    azurerm_network_interface.worker[count.index].id
  ]

  source_image_id = var.talos_image_id

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 100
  }

  admin_ssh_key {
    username   = "talos"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  tags = {
    Role = "worker"
  }
}
```

## Bootstrapping the Cluster

Once Terraform finishes provisioning, generate and apply the Talos configuration:

```bash
# Generate secrets and machine configurations
talosctl gen secrets -o secrets.yaml
talosctl gen config talos-cluster https://<LB_PUBLIC_IP>:6443 \
  --with-secrets secrets.yaml

# Apply configuration to control plane nodes
for ip in <CP_IPS>; do
  talosctl apply-config --insecure --nodes $ip --file controlplane.yaml
done

# Apply configuration to worker nodes
for ip in <WORKER_IPS>; do
  talosctl apply-config --insecure --nodes $ip --file worker.yaml
done

# Bootstrap the first control plane node
talosctl bootstrap --nodes <FIRST_CP_IP> \
  --endpoints <FIRST_CP_IP> \
  --talosconfig talosconfig
```

## Best Practices for Production

When running Talos on Azure in production, use availability zones to spread your nodes across fault domains. Enable Azure Disk encryption for the OS and data disks. Store your Terraform state in an Azure Storage Account backend with state locking enabled.

You should also consider using Azure Private Link for the load balancer endpoint if your cluster should not be accessible from the public internet. Combine this with Azure Firewall or Network Security Groups to restrict traffic to known IP ranges.

Talos Linux on Azure with Terraform is a powerful combination for teams that want full control over their Kubernetes infrastructure without the operational overhead of managing a traditional Linux distribution on every node.
