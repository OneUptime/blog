# How to Configure Azure DNS for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, DNS, AAAA Records, Private DNS, Azure DNS

Description: Create AAAA records in Azure DNS public and private zones, configure reverse DNS for IPv6 addresses, and manage dual-stack DNS entries for Azure resources.

## Introduction

Azure DNS fully supports IPv6 AAAA records in both public and private DNS zones. For dual-stack deployments, you maintain both A (IPv4) and AAAA (IPv6) records pointing to your Azure resources. Azure supports reverse DNS (PTR records) for Azure public IPv4 addresses, but not for Azure-owned public IPv6 addresses. Private DNS zones also support AAAA records for internal IPv6 resolution within VNets.

## Create AAAA Records in Azure DNS

```bash
RG="rg-dns"
ZONE_NAME="example.com"

# Create DNS zone

az network dns zone create \
    --resource-group "$RG" \
    --name "$ZONE_NAME"

# Create AAAA record
az network dns record-set aaaa create \
    --resource-group "$RG" \
    --zone-name "$ZONE_NAME" \
    --name "www" \
    --ttl 300

az network dns record-set aaaa add-record \
    --resource-group "$RG" \
    --zone-name "$ZONE_NAME" \
    --record-set-name "www" \
    --ipv6-address "2001:db8::1"

# Add AAAA record for API subdomain
az network dns record-set aaaa create \
    --resource-group "$RG" \
    --zone-name "$ZONE_NAME" \
    --name "api" \
    --ttl 60

az network dns record-set aaaa add-record \
    --resource-group "$RG" \
    --zone-name "$ZONE_NAME" \
    --record-set-name "api" \
    --ipv6-address "2001:db8::10"

# List AAAA records
az network dns record-set aaaa list \
    --resource-group "$RG" \
    --zone-name "$ZONE_NAME"
```

## Terraform Azure DNS AAAA Records

```hcl
# dns_ipv6.tf

resource "azurerm_dns_zone" "main" {
  name                = "example.com"
  resource_group_name = azurerm_resource_group.main.name
}

# AAAA record pointing to static IPv6 address
resource "azurerm_dns_aaaa_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 300

  records = ["2001:db8::1", "2001:db8::2"]
}

# AAAA record pointing to Azure public IP
resource "azurerm_dns_aaaa_record" "app" {
  name                = "app"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 60

  # Use the IPv6 address from a statically allocated IPv6 public IP resource
  records = [azurerm_public_ip.app_ipv6.ip_address]

  depends_on = [azurerm_public_ip.app_ipv6]
}

# A record for IPv4 (alongside AAAA)
resource "azurerm_dns_a_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 300

  records = ["203.0.113.10"]
}
```

## Private DNS Zone for IPv6

```bash
# Create private DNS zone for IPv6 internal resolution
az network private-dns zone create \
    --resource-group "$RG" \
    --name "internal.example.com"

# Link to VNet (autoregistration creates A records for VMs; add AAAA records manually)
az network private-dns link vnet create \
    --resource-group "$RG" \
    --zone-name "internal.example.com" \
    --name "vnet-link" \
    --virtual-network vnet-dualstack \
    --registration-enabled true

# Add AAAA record in private zone
az network private-dns record-set aaaa create \
    --resource-group "$RG" \
    --zone-name "internal.example.com" \
    --name "dbserver"

az network private-dns record-set aaaa add-record \
    --resource-group "$RG" \
    --zone-name "internal.example.com" \
    --record-set-name "dbserver" \
    --ipv6-address "fd00:db8:0:3::50"
```

## Reverse DNS for Azure Public IPv6

Azure DNS doesn't currently support reverse DNS (PTR records) for Azure-owned public IPv6 addresses. The `--reverse-fqdn` option on Azure public IP resources can be used for public IPv4 reverse DNS, but there's no supported Azure DNS configuration for Azure-owned IPv6 `ip6.arpa` PTR records.

## Verify DNS Configuration

```bash
# Check AAAA records
dig www.example.com AAAA

# Check both A and AAAA
dig www.example.com A
dig www.example.com AAAA

# Show the Azure DNS nameservers assigned to the zone
az network dns zone show \
    --resource-group "$RG" \
    --name "$ZONE_NAME" \
    --query "nameServers"

# Query against one of the authoritative Azure DNS nameservers for the zone
NS=$(az network dns zone show -g "$RG" -n "$ZONE_NAME" --query "nameServers[0]" -o tsv)
dig @"$NS" www.example.com AAAA
```

## Conclusion

Azure DNS AAAA records are created with `az network dns record-set aaaa add-record` or `azurerm_dns_aaaa_record` in Terraform. Maintain both A and AAAA records for dual-stack services, pointing to the respective IPv4 and IPv6 public IP addresses. Private DNS zones support AAAA records for internal IPv6 resolution within VNets, while Azure Private DNS autoregistration creates A records for VM primary NICs and doesn't create AAAA records automatically. Azure-owned public IPv6 addresses don't currently support reverse DNS with Azure DNS.
