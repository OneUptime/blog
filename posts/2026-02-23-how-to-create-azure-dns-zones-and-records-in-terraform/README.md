# How to Create Azure DNS Zones and Records in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, DNS, Networking, Infrastructure as Code, Domain Management

Description: Learn how to create and manage Azure DNS zones and records in Terraform including A, CNAME, MX, TXT records and private DNS zones for VNet integration.

---

DNS configuration is something you set up once and then forget about - until it breaks and everything goes down. Managing DNS records through Terraform eliminates the risk of manual errors in the portal, gives you version history of every change, and makes it possible to spin up complete environments with proper DNS configuration automatically.

This guide covers creating both public and private DNS zones in Terraform, adding various record types, and integrating DNS with other Azure services.

## Provider Configuration

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
```

## Resource Group

```hcl
# main.tf
resource "azurerm_resource_group" "dns" {
  name     = "rg-dns-production"
  location = "East US"
}
```

## Public DNS Zone

A public DNS zone hosts records that are resolvable from the internet.

```hcl
# public-zone.tf
# Create a public DNS zone
resource "azurerm_dns_zone" "main" {
  name                = "example.com"
  resource_group_name = azurerm_resource_group.dns.name

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

After creating the zone, Azure assigns name servers. You need to update your domain registrar to point to these name servers.

## A Records

A records map a hostname to an IPv4 address.

```hcl
# records.tf
# A record pointing to a static IP
resource "azurerm_dns_a_record" "web" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = ["20.185.100.50"]
}

# A record at the zone apex (bare domain)
resource "azurerm_dns_a_record" "apex" {
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = ["20.185.100.50"]
}

# A record pointing to an Azure resource (alias record)
resource "azurerm_dns_a_record" "app" {
  name                = "app"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  # Use target_resource_id for alias records pointing to Azure resources
  target_resource_id = var.public_ip_id
}
```

## AAAA Records

AAAA records map a hostname to an IPv6 address.

```hcl
resource "azurerm_dns_aaaa_record" "web" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = ["2001:0db8:85a3:0000:0000:8a2e:0370:7334"]
}
```

## CNAME Records

CNAME records create an alias from one hostname to another.

```hcl
# CNAME for a subdomain pointing to an Azure service
resource "azurerm_dns_cname_record" "api" {
  name                = "api"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  record              = "api-production.azurewebsites.net"
}

# CNAME for CDN or Front Door
resource "azurerm_dns_cname_record" "cdn" {
  name                = "static"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 3600
  record              = "fd-production.azurefd.net"
}

# CNAME for email service verification
resource "azurerm_dns_cname_record" "email_verify" {
  name                = "em1234"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 3600
  record              = "verify.emailprovider.com"
}
```

## MX Records

MX records configure email routing for your domain.

```hcl
# MX records for email delivery
resource "azurerm_dns_mx_record" "main" {
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 3600

  # Multiple MX records with priorities
  record {
    preference = 10
    exchange   = "mail1.example.com."
  }

  record {
    preference = 20
    exchange   = "mail2.example.com."
  }
}
```

## TXT Records

TXT records are used for domain verification, SPF, DKIM, and DMARC.

```hcl
# SPF record to authorize email senders
resource "azurerm_dns_txt_record" "spf" {
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 3600

  record {
    value = "v=spf1 include:_spf.google.com include:spf.protection.outlook.com -all"
  }
}

# DMARC policy
resource "azurerm_dns_txt_record" "dmarc" {
  name                = "_dmarc"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 3600

  record {
    value = "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
  }
}

# Domain verification for Azure services
resource "azurerm_dns_txt_record" "azure_verify" {
  name                = "asuid"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 3600

  record {
    value = var.azure_verification_id
  }
}
```

## SRV Records

SRV records define the location of services.

```hcl
# SRV record for SIP service
resource "azurerm_dns_srv_record" "sip" {
  name                = "_sip._tcp"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 3600

  record {
    priority = 10
    weight   = 60
    port     = 5060
    target   = "sip.example.com."
  }
}
```

## NS Records for Subdomain Delegation

Delegate a subdomain to a different DNS zone.

```hcl
# Delegate dev.example.com to a separate zone
resource "azurerm_dns_ns_record" "dev" {
  name                = "dev"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 3600

  records = [
    "ns1-dev.azure-dns.com.",
    "ns2-dev.azure-dns.net.",
  ]
}
```

## Private DNS Zone

Private DNS zones resolve names within your Azure virtual networks.

```hcl
# private-dns.tf
# Private DNS zone for internal services
resource "azurerm_private_dns_zone" "internal" {
  name                = "internal.example.com"
  resource_group_name = azurerm_resource_group.dns.name

  tags = {
    environment = "production"
    purpose     = "internal-dns"
  }
}

# Link the private zone to a VNet
resource "azurerm_private_dns_zone_virtual_network_link" "main" {
  name                  = "vnet-link-production"
  resource_group_name   = azurerm_resource_group.dns.name
  private_dns_zone_name = azurerm_private_dns_zone.internal.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = true  # Auto-register VM DNS records
}

# Private A record for an internal service
resource "azurerm_private_dns_a_record" "api" {
  name                = "api"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = ["10.0.1.100"]
}

# Private A record for a database
resource "azurerm_private_dns_a_record" "db" {
  name                = "db"
  zone_name           = azurerm_private_dns_zone.internal.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = ["10.0.2.50"]
}
```

## Creating Records Dynamically

Use `for_each` to manage records from a map.

```hcl
# dynamic-records.tf
variable "dns_a_records" {
  description = "Map of A records to create"
  type = map(object({
    ttl     = number
    records = list(string)
  }))
  default = {
    "blog"    = { ttl = 300, records = ["20.185.100.51"] }
    "shop"    = { ttl = 300, records = ["20.185.100.52"] }
    "docs"    = { ttl = 300, records = ["20.185.100.53"] }
    "support" = { ttl = 300, records = ["20.185.100.54"] }
  }
}

resource "azurerm_dns_a_record" "dynamic" {
  for_each            = var.dns_a_records
  name                = each.key
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = each.value.ttl
  records             = each.value.records
}
```

## Outputs

```hcl
# outputs.tf
output "name_servers" {
  value       = azurerm_dns_zone.main.name_servers
  description = "Name servers for the DNS zone - update these at your registrar"
}

output "zone_id" {
  value       = azurerm_dns_zone.main.id
  description = "Resource ID of the DNS zone"
}
```

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# After applying, check the name servers
terraform output name_servers
```

Update your domain registrar with the name servers from the output. DNS propagation can take up to 48 hours, though it usually happens within a few minutes.

DNS in Terraform gives you an audit trail for every record change, the ability to review changes before they go live, and a reliable way to replicate DNS configurations across environments. Once you manage DNS as code, you will never want to go back to clicking through a web console.
