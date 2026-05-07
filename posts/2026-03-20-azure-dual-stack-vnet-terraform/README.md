# How to Configure Azure Dual-Stack VNet with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, IPv6, Dual-Stack, VNet, Networking

Description: A guide to creating an Azure Virtual Network with dual-stack (IPv4 and IPv6) address space and subnets using Terraform.

Azure supports dual-stack Virtual Networks where both IPv4 and IPv6 address spaces coexist. VMs and supported services in these VNets can be assigned both address families, enabling gradual IPv6 migration or full dual-stack deployments.

## Step 1: Configure the Azure Provider

```hcl
# provider.tf

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
```

## Step 2: Create a Resource Group

```hcl
# rg.tf
resource "azurerm_resource_group" "main" {
  name     = "rg-ipv6-network"
  location = "East US"
}
```

## Step 3: Create a Dual-Stack Virtual Network

Azure VNets support multiple address spaces - add both an IPv4 and an IPv6 range:

```hcl
# vnet.tf - Dual-stack VNet with IPv4 and IPv6 address spaces
resource "azurerm_virtual_network" "main" {
  name                = "vnet-dual-stack"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # Specify both IPv4 and IPv6 address spaces
  address_space = [
    "10.0.0.0/16",           # IPv4 address space
    "fd12:3456:789a::/48"    # IPv6 address space (use ULA or an organization-owned global prefix)
  ]

  tags = {
    Environment = "production"
  }
}
```

## Step 4: Create Dual-Stack Subnets

Each subnet needs separate address prefixes for IPv4 and IPv6:

```hcl
# subnets.tf - Dual-stack subnets
resource "azurerm_subnet" "web" {
  name                 = "snet-web"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name

  # Both IPv4 and IPv6 prefixes for the subnet
  address_prefixes = [
    "10.0.1.0/24",
    "fd12:3456:789a:deed::/64"
  ]
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name

  address_prefixes = [
    "10.0.2.0/24",
    "fd12:3456:789a:beef::/64"
  ]
}
```

## Step 5: Create Dual-Stack Public IP Addresses

To expose VMs on IPv6, create separate IPv4 and IPv6 public IPs:

```hcl
# public-ips.tf - Dual-stack public IP addresses
resource "azurerm_public_ip" "ipv4" {
  name                = "pip-ipv4"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv4"
}

resource "azurerm_public_ip" "ipv6" {
  name                = "pip-ipv6"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv6"
}
```

## Step 6: Create a Dual-Stack Network Interface

```hcl
# nic.tf - NIC with both IPv4 and IPv6 configurations
resource "azurerm_network_interface" "main" {
  name                = "nic-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # IPv4 IP configuration (primary)
  ip_configuration {
    name                          = "ipv4-config"
    subnet_id                     = azurerm_subnet.web.id
    private_ip_address_allocation = "Dynamic"
    private_ip_address_version    = "IPv4"
    public_ip_address_id          = azurerm_public_ip.ipv4.id
    primary                       = true
  }

  # IPv6 IP configuration (secondary)
  ip_configuration {
    name                          = "ipv6-config"
    subnet_id                     = azurerm_subnet.web.id
    private_ip_address_allocation = "Dynamic"
    private_ip_address_version    = "IPv6"
    public_ip_address_id          = azurerm_public_ip.ipv6.id
  }
}
```

## Step 7: Apply and Verify

```bash
terraform init
terraform apply

# Check VNet address spaces
az network vnet show \
  --resource-group rg-ipv6-network \
  --name vnet-dual-stack \
  --query 'addressSpace.addressPrefixes'

# Check subnet prefixes
az network vnet subnet list \
  --resource-group rg-ipv6-network \
  --vnet-name vnet-dual-stack \
  --query '[*].addressPrefixes'
```

Azure dual-stack VNets allow you to run IPv4 and IPv6 workloads side by side with minimal configuration overhead, making them an ideal starting point for enterprise IPv6 migration on Azure.
