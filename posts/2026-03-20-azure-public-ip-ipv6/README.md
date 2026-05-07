# How to Create Azure Public IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Public IP, Standard SKU, Dual-Stack, Cloud Networking

Description: Create and manage Azure public IPv6 addresses, assign them to VMs and load balancers, and configure IPv6 public IP prefixes for multiple allocations.

## Introduction

Azure public IPv6 addresses provide globally routable IPv6 connectivity for VMs, load balancers, and gateways. Azure public IPv6 addresses use static allocation with the Standard SKU. Basic SKU public IPs were retired on September 30, 2025. Azure can also allocate IPv6 public IP prefixes, allowing you to reserve a contiguous range of IPv6 addresses.

## Create Public IPv6 Address

```bash
RG="rg-ipv6"
LOCATION="eastus"

# Create a static IPv6 public IP (Standard SKU required)

az network public-ip create \
    --resource-group "$RG" \
    --name pip-web-ipv6 \
    --version IPv6 \
    --sku Standard \
    --allocation-method Static \
    --zone 1 2 3 \
    --location "$LOCATION"

# View the assigned IPv6 address
az network public-ip show \
    --resource-group "$RG" \
    --name pip-web-ipv6 \
    --query "{name:name, ipAddress:ipAddress, version:publicIPAddressVersion}"

# List all public IPs
az network public-ip list \
    --resource-group "$RG" \
    --query "[*].{name:name, IP:ipAddress, version:publicIPAddressVersion}"
```

## Terraform Public IPv6 Configuration

```hcl
# public_ip_ipv6.tf

# IPv4 public IP
resource "azurerm_public_ip" "ipv4" {
  name                = "pip-web-ipv4"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv4"
  zones               = ["1", "2", "3"]

  tags = { purpose = "web" }
}

# IPv6 public IP
resource "azurerm_public_ip" "ipv6" {
  name                = "pip-web-ipv6"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv6"
  zones               = ["1", "2", "3"]

  tags = { purpose = "web" }
}

output "public_ipv4" {
  value = azurerm_public_ip.ipv4.ip_address
}

output "public_ipv6" {
  value = azurerm_public_ip.ipv6.ip_address
}
```

## IPv6 Public IP Prefix

```bash
# Reserve a /127 IPv6 public IP prefix (2 addresses)
az network public-ip prefix create \
    --resource-group "$RG" \
    --name pip-prefix-ipv6 \
    --location "$LOCATION" \
    --version IPv6 \
    --length 127 \
    --sku Standard

# View the allocated prefix
az network public-ip prefix show \
    --resource-group "$RG" \
    --name pip-prefix-ipv6 \
    --query "{prefix:ipPrefix, prefixLength:prefixLength}"

# Allocate public IPs from the prefix
az network public-ip create \
    --resource-group "$RG" \
    --name pip-from-prefix-1 \
    --public-ip-prefix pip-prefix-ipv6 \
    --version IPv6 \
    --sku Standard \
    --allocation-method Static
```

## DNS Configuration for Public IPv6

```bash
# Assign DNS label to IPv6 public IP
az network public-ip update \
    --resource-group "$RG" \
    --name pip-web-ipv6 \
    --dns-name "myapp-ipv6"

# DNS name becomes: myapp-ipv6.eastus.cloudapp.azure.com
# Verify DNS
dig AAAA myapp-ipv6.eastus.cloudapp.azure.com

# The FQDN for IPv6 public IPs
az network public-ip show \
    --resource-group "$RG" \
    --name pip-web-ipv6 \
    --query "dnsSettings.fqdn"
```

## Attach IPv6 Public IP to VM NIC

```bash
# Update an existing secondary IPv6 NIC IP configuration to use the IPv6 public IP
az network nic ip-config update \
    --resource-group "$RG" \
    --nic-name nic-web-01 \
    --name ipv6-config \
    --public-ip-address pip-web-ipv6

# Verify
az network nic ip-config show \
    --resource-group "$RG" \
    --nic-name nic-web-01 \
    --name ipv6-config \
    --query "{privateIP:privateIPAddress, publicIP:publicIPAddress.id}"
```

## Conclusion

Azure public IPv6 addresses require the Standard SKU and Static allocation method. Create IPv6 public IPs with `--version IPv6 --sku Standard --allocation-method Static`. Assign DNS labels to IPv6 public IPs for use in DNS records. For production workloads in regions that support Availability Zones, use zone-redundant IPv6 public IPs with `--zone 1 2 3`. IPv6 public IP prefixes allow reserving contiguous blocks, which is useful for whitelist management and predictable address allocation for multiple services.
