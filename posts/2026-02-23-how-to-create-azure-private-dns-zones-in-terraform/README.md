# How to Create Azure Private DNS Zones in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Private DNS, Networking, Infrastructure as Code, DNS

Description: A hands-on guide to creating Azure Private DNS zones with Terraform, including VNet links, record management, auto-registration, and private endpoint DNS integration.

---

Azure Private DNS provides a reliable and secure DNS service for your virtual networks. It lets you use custom domain names within your Azure private networks instead of relying on the default Azure-provided names. This is essential for service discovery, private endpoint resolution, and maintaining clean, human-readable hostnames for your internal resources.

Without Private DNS zones, resolving names for resources connected via private endpoints or across peered VNets becomes messy. You end up hardcoding IP addresses or setting up custom DNS servers. Private DNS zones solve this cleanly and natively within Azure, and Terraform makes managing the zones, records, and VNet links straightforward.

## When You Need Private DNS Zones

There are several common scenarios:

- **Private endpoints** - when you create a private endpoint for an Azure PaaS service (Storage, SQL, Key Vault, etc.), you need a Private DNS zone so clients in your VNet can resolve the service's FQDN to the private IP
- **Custom internal domains** - using names like `app.internal.example.com` for your internal services instead of raw IP addresses
- **Auto-registration** - automatically creating DNS records when VMs are deployed in linked VNets
- **Split-horizon DNS** - resolving the same domain name differently from inside and outside your network

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

## Creating a Private DNS Zone

```hcl
resource "azurerm_resource_group" "dns" {
  name     = "rg-dns-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Private DNS zone for internal services
resource "azurerm_private_dns_zone" "internal" {
  name                = "internal.example.com"
  resource_group_name = azurerm_resource_group.dns.name

  tags = {
    Environment = "Production"
  }
}
```

## Linking DNS Zones to Virtual Networks

Private DNS zones must be linked to virtual networks for resources in those VNets to resolve records:

```hcl
# Hub VNet
resource "azurerm_virtual_network" "hub" {
  name                = "vnet-hub-prod"
  location            = azurerm_resource_group.dns.location
  resource_group_name = azurerm_resource_group.dns.name
  address_space       = ["10.0.0.0/16"]
}

# Spoke VNet
resource "azurerm_virtual_network" "spoke" {
  name                = "vnet-spoke-prod"
  location            = azurerm_resource_group.dns.location
  resource_group_name = azurerm_resource_group.dns.name
  address_space       = ["10.1.0.0/16"]
}

# Link the private DNS zone to the hub VNet with auto-registration enabled
resource "azurerm_private_dns_zone_virtual_network_link" "hub" {
  name                  = "link-hub"
  resource_group_name   = azurerm_resource_group.dns.name
  private_dns_zone_name = azurerm_private_dns_zone.internal.name
  virtual_network_id    = azurerm_virtual_network.hub.id

  # Auto-registration creates A records for VMs deployed in this VNet
  registration_enabled = true

  tags = {
    Environment = "Production"
  }
}

# Link to spoke VNet (resolution only, no auto-registration)
resource "azurerm_private_dns_zone_virtual_network_link" "spoke" {
  name                  = "link-spoke"
  resource_group_name   = azurerm_resource_group.dns.name
  private_dns_zone_name = azurerm_private_dns_zone.internal.name
  virtual_network_id    = azurerm_virtual_network.spoke.id

  # Only one VNet link per zone can have auto-registration enabled
  # Spoke VNet gets resolution only
  registration_enabled = false

  tags = {
    Environment = "Production"
  }
}
```

## Managing DNS Records

```hcl
# A record pointing to an internal load balancer
resource "azurerm_private_dns_a_record" "api" {
  name                = "api"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  records = ["10.0.1.10"]
}

# A record with multiple IPs (round-robin)
resource "azurerm_private_dns_a_record" "web" {
  name                = "web"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  records = ["10.0.1.20", "10.0.1.21", "10.0.1.22"]
}

# CNAME record
resource "azurerm_private_dns_cname_record" "portal" {
  name                = "portal"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  record = "web.internal.example.com"
}

# SRV record for service discovery
resource "azurerm_private_dns_srv_record" "sip" {
  name                = "_sip._tcp"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  record {
    priority = 10
    weight   = 60
    port     = 5060
    target   = "sip1.internal.example.com"
  }

  record {
    priority = 10
    weight   = 40
    port     = 5060
    target   = "sip2.internal.example.com"
  }
}

# TXT record
resource "azurerm_private_dns_txt_record" "verification" {
  name                = "verification"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  record {
    value = "v=verify site=internal-portal"
  }
}

# MX record for internal mail routing
resource "azurerm_private_dns_mx_record" "mail" {
  name                = "@"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  record {
    preference = 10
    exchange   = "mail1.internal.example.com"
  }

  record {
    preference = 20
    exchange   = "mail2.internal.example.com"
  }
}

# PTR record for reverse DNS
resource "azurerm_private_dns_ptr_record" "api_reverse" {
  name                = "10"
  zone_name           = azurerm_private_dns_zone.reverse.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  records = ["api.internal.example.com"]
}

# Reverse DNS zone
resource "azurerm_private_dns_zone" "reverse" {
  name                = "1.0.10.in-addr.arpa"
  resource_group_name = azurerm_resource_group.dns.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "reverse_hub" {
  name                  = "link-reverse-hub"
  resource_group_name   = azurerm_resource_group.dns.name
  private_dns_zone_name = azurerm_private_dns_zone.reverse.name
  virtual_network_id    = azurerm_virtual_network.hub.id
}
```

## Private Endpoint DNS Zones

The most common use of Private DNS zones is resolving Azure PaaS services through private endpoints. Each service has a specific zone name:

```hcl
# Private DNS zones for common Azure services
resource "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.dns.name
}

resource "azurerm_private_dns_zone" "sql" {
  name                = "privatelink.database.windows.net"
  resource_group_name = azurerm_resource_group.dns.name
}

resource "azurerm_private_dns_zone" "keyvault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = azurerm_resource_group.dns.name
}

resource "azurerm_private_dns_zone" "acr" {
  name                = "privatelink.azurecr.io"
  resource_group_name = azurerm_resource_group.dns.name
}

resource "azurerm_private_dns_zone" "eventhub" {
  name                = "privatelink.servicebus.windows.net"
  resource_group_name = azurerm_resource_group.dns.name
}

resource "azurerm_private_dns_zone" "cosmosdb" {
  name                = "privatelink.documents.azure.com"
  resource_group_name = azurerm_resource_group.dns.name
}

# Link all zones to the hub VNet
locals {
  private_dns_zones = {
    blob     = azurerm_private_dns_zone.blob.id
    sql      = azurerm_private_dns_zone.sql.id
    keyvault = azurerm_private_dns_zone.keyvault.id
    acr      = azurerm_private_dns_zone.acr.id
    eventhub = azurerm_private_dns_zone.eventhub.id
    cosmosdb = azurerm_private_dns_zone.cosmosdb.id
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "service_zones_hub" {
  for_each = local.private_dns_zones

  name                  = "link-${each.key}-hub"
  resource_group_name   = azurerm_resource_group.dns.name
  private_dns_zone_name = each.key == "blob" ? azurerm_private_dns_zone.blob.name : each.key == "sql" ? azurerm_private_dns_zone.sql.name : each.key == "keyvault" ? azurerm_private_dns_zone.keyvault.name : each.key == "acr" ? azurerm_private_dns_zone.acr.name : each.key == "eventhub" ? azurerm_private_dns_zone.eventhub.name : azurerm_private_dns_zone.cosmosdb.name
  virtual_network_id    = azurerm_virtual_network.hub.id
  registration_enabled  = false
}

# Link all zones to the spoke VNet as well
resource "azurerm_private_dns_zone_virtual_network_link" "service_zones_spoke" {
  for_each = local.private_dns_zones

  name                  = "link-${each.key}-spoke"
  resource_group_name   = azurerm_resource_group.dns.name
  private_dns_zone_name = each.key == "blob" ? azurerm_private_dns_zone.blob.name : each.key == "sql" ? azurerm_private_dns_zone.sql.name : each.key == "keyvault" ? azurerm_private_dns_zone.keyvault.name : each.key == "acr" ? azurerm_private_dns_zone.acr.name : each.key == "eventhub" ? azurerm_private_dns_zone.eventhub.name : azurerm_private_dns_zone.cosmosdb.name
  virtual_network_id    = azurerm_virtual_network.spoke.id
  registration_enabled  = false
}
```

## Using a Module for Private DNS Zone Management

For cleaner code, use a module:

```hcl
# modules/private-dns-zone/variables.tf
variable "zone_name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "vnet_links" {
  description = "Map of VNet links to create"
  type = map(object({
    vnet_id              = string
    registration_enabled = bool
  }))
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

```hcl
# modules/private-dns-zone/main.tf
resource "azurerm_private_dns_zone" "this" {
  name                = var.zone_name
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "this" {
  for_each = var.vnet_links

  name                  = "link-${each.key}"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.this.name
  virtual_network_id    = each.value.vnet_id
  registration_enabled  = each.value.registration_enabled
}
```

```hcl
# Usage with the module
module "dns_blob" {
  source              = "./modules/private-dns-zone"
  zone_name           = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.dns.name

  vnet_links = {
    hub = {
      vnet_id              = azurerm_virtual_network.hub.id
      registration_enabled = false
    }
    spoke = {
      vnet_id              = azurerm_virtual_network.spoke.id
      registration_enabled = false
    }
  }

  tags = { Environment = "Production" }
}
```

## Outputs

```hcl
output "internal_dns_zone_id" {
  description = "Internal private DNS zone ID"
  value       = azurerm_private_dns_zone.internal.id
}

output "internal_dns_zone_name" {
  description = "Internal private DNS zone name"
  value       = azurerm_private_dns_zone.internal.name
}

output "blob_dns_zone_id" {
  description = "Blob storage private DNS zone ID"
  value       = azurerm_private_dns_zone.blob.id
}
```

## Best Practices

**Create Private DNS zones in a centralized resource group.** Managing all DNS zones in one place makes it easier to maintain and avoids duplication. Link them to VNets across subscriptions as needed.

**Use auto-registration sparingly.** Only one VNet link per zone can have auto-registration enabled. Use it for your primary VNet where VMs are deployed, but keep resolution-only links for other VNets.

**Set appropriate TTLs.** Lower TTLs (60-300 seconds) for records that change frequently. Higher TTLs (3600+ seconds) for stable records. The default of 3600 seconds is reasonable for most cases.

**Create all required privatelink zones upfront.** Rather than creating Private DNS zones on demand when you create private endpoints, provision all the zones you will need from the start. This prevents race conditions and ensures consistent configuration.

**Link zones to all VNets that need resolution.** A common mistake is creating a Private DNS zone and linking it to only one VNet. Any VNet that has clients needing to resolve the records must be linked.

**Use conditional forwarders for hybrid scenarios.** If you have on-premises DNS servers that need to resolve Azure Private DNS zones, set up conditional forwarding through Azure DNS Private Resolver or use a custom DNS forwarder VM.

## Conclusion

Azure Private DNS zones with Terraform provide the foundation for name resolution in private Azure networks. Whether you are setting up custom internal domains, enabling private endpoint resolution, or building a complete hybrid DNS architecture, Terraform lets you define it all as code. The key is planning your zone structure, linking zones to all necessary VNets, and creating the privatelink zones before you start deploying private endpoints. Get the DNS right, and everything else in your network becomes much simpler.
