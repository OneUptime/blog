# How to Create Azure DNS Zones and Records with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Infrastructure as Code, IaC, DNS, Azure DNS

Description: Learn how to create Azure DNS zones, A records, CNAME records, and private DNS zones using OpenTofu.

## Introduction

This guide covers how to create Azure DNS zones and records with OpenTofu. You will learn step-by-step configuration for public DNS zones, A records, CNAME records, and private DNS zones with production-ready HCL code.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured (Service Principal or Azure CLI)
- AzureRM provider version ~> 4.0
- A registered public domain you can delegate to Azure DNS
- An existing virtual network ID for the private DNS zone link

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

## Step 2: Define Variables

```hcl
variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for deployment"
  type        = string
}

variable "public_dns_zone_name" {
  description = "Public DNS zone name"
  type        = string
}

variable "private_dns_zone_name" {
  description = "Private DNS zone name"
  type        = string
}

variable "private_vnet_id" {
  description = "Virtual network ID to link with the private DNS zone"
  type        = string
}

variable "location" {
  description = "Azure region for the resource group"
  type        = string
  default     = "East US"
}

variable "public_a_records" {
  description = "IPv4 addresses for the public www A record"
  type        = list(string)
}

variable "private_a_records" {
  description = "IPv4 addresses for the private api A record"
  type        = list(string)
}

variable "public_cname_target" {
  description = "FQDN target for the public app CNAME record"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
```

## Step 3: Create the DNS Zones

```hcl
# Resource group for DNS resources
resource "azurerm_resource_group" "dns" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    ManagedBy   = "OpenTofu"
    Service     = "dns"
  }
}

# Public Azure DNS zone
resource "azurerm_dns_zone" "public" {
  name                = var.public_dns_zone_name
  resource_group_name = azurerm_resource_group.dns.name

  tags = {
    Environment = var.environment
    ManagedBy   = "OpenTofu"
  }
}
```

## Step 4: Create Public DNS Records

```hcl
# Public www A record
resource "azurerm_dns_a_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.public.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = var.public_a_records
}

# Public app CNAME record
resource "azurerm_dns_cname_record" "app" {
  name                = "app"
  zone_name           = azurerm_dns_zone.public.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  record              = var.public_cname_target
}
```

## Step 5: Add Private DNS Configuration

```hcl
# Private DNS zone
resource "azurerm_private_dns_zone" "private" {
  name                = var.private_dns_zone_name
  resource_group_name = azurerm_resource_group.dns.name

  tags = {
    Environment = var.environment
    ManagedBy   = "OpenTofu"
  }
}

# Link the private DNS zone to an existing virtual network
resource "azurerm_private_dns_zone_virtual_network_link" "private_link" {
  name                  = "private-dns-link-${var.environment}"
  resource_group_name   = azurerm_resource_group.dns.name
  private_dns_zone_name = azurerm_private_dns_zone.private.name
  virtual_network_id    = var.private_vnet_id
  registration_enabled  = false
}

# Private api A record
resource "azurerm_private_dns_a_record" "api" {
  name                = "api"
  zone_name           = azurerm_private_dns_zone.private.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = var.private_a_records
}
```

## Step 6: Define Outputs

```hcl
output "resource_group_name" {
  description = "The resource group containing the DNS resources"
  value       = azurerm_resource_group.dns.name
}

output "public_dns_zone_name" {
  description = "The public DNS zone name"
  value       = azurerm_dns_zone.public.name
}

output "public_name_servers" {
  description = "Azure name servers for the public DNS zone"
  value       = azurerm_dns_zone.public.name_servers
}

output "private_dns_zone_name" {
  description = "The private DNS zone name"
  value       = azurerm_private_dns_zone.private.name
}

output "private_dns_vnet_link_name" {
  description = "The private DNS virtual network link name"
  value       = azurerm_private_dns_zone_virtual_network_link.private_link.name
}
```

## Step 7: Deploy

```bash
# Initialize and download providers
tofu init

# Validate the configuration
tofu validate

# Preview changes
tofu plan -var-file="production.tfvars"

# Apply changes
tofu apply -var-file="production.tfvars"
```

## Verification

```bash
# Verify the public DNS zone
az network dns zone show \
  --resource-group $(tofu output -raw resource_group_name) \
  --name $(tofu output -raw public_dns_zone_name)

# Verify the public www A record
az network dns record-set a show \
  --resource-group $(tofu output -raw resource_group_name) \
  --zone-name $(tofu output -raw public_dns_zone_name) \
  --name www

# Verify the public app CNAME record
az network dns record-set cname show \
  --resource-group $(tofu output -raw resource_group_name) \
  --zone-name $(tofu output -raw public_dns_zone_name) \
  --name app

# Verify the private DNS zone
az network private-dns zone show \
  --resource-group $(tofu output -raw resource_group_name) \
  --name $(tofu output -raw private_dns_zone_name)

# Verify the private DNS virtual network link
az network private-dns link vnet show \
  --resource-group $(tofu output -raw resource_group_name) \
  --zone-name $(tofu output -raw private_dns_zone_name) \
  --name $(tofu output -raw private_dns_vnet_link_name)

# Verify the private api A record
az network private-dns record-set a show \
  --resource-group $(tofu output -raw resource_group_name) \
  --zone-name $(tofu output -raw private_dns_zone_name) \
  --name api
```

## Best Practices

- Delegate the public zone at your domain registrar after deployment so Azure name servers become authoritative
- Use lower TTL values during migrations, then increase TTLs after DNS cutover is stable
- Link private DNS zones only to virtual networks that require name resolution
- Enable automatic registration on private DNS links only when you want Azure to manage VM host records
- Tag DNS resources for governance, ownership, and lifecycle tracking

## Conclusion

You have successfully configured Azure DNS public and private zones with OpenTofu. This production-ready configuration creates a public DNS zone, A record, CNAME record, private DNS zone, and a virtual network link for private name resolution. Always review the Azure documentation for service-specific limits and recommendations before deploying to production.
