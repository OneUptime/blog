# How to Create Azure NAT Gateway with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, NAT Gateway, SNAT, Outbound Connectivity, VNet, Infrastructure as Code

Description: Learn how to configure Azure NAT Gateway with OpenTofu to provide scalable, highly available outbound internet connectivity for private subnet resources without SNAT port exhaustion.

## Introduction

Azure NAT Gateway provides outbound-only internet connectivity for resources in subnets. Unlike Load Balancer SNAT or instance-level public IPs, NAT Gateway scales automatically to support up to 64,512 SNAT ports per public IP address. The StandardV2 SKU is zone-redundant, while the Standard SKU used in the examples below can be deployed as zonal or no-zone. It reduces the risk of SNAT port exhaustion for high-connection-count workloads (such as microservices making many outbound API calls) and provides a stable source IP for outbound connections-useful for IP allowlisting with external services.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A Virtual Network with private subnets

## Step 1: Create NAT Gateway

```hcl
resource "azurerm_public_ip" "nat" {
  name                = "${var.project_name}-nat-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"  # Match the Standard NAT Gateway SKU
  zones               = ["1"]       # Match the NAT Gateway zone for Standard SKU deployments

  tags = {
    Name = "${var.project_name}-nat-public-ip"
  }
}

resource "azurerm_nat_gateway" "main" {
  name                    = "${var.project_name}-nat-gateway"
  location                = var.location
  resource_group_name     = var.resource_group_name
  sku_name                = "Standard"
  idle_timeout_in_minutes = 4  # 4-120 minutes, default 4

  # Standard NAT Gateway can be zonal or no-zone
  zones = ["1"]

  tags = {
    Name = "${var.project_name}-nat-gateway"
  }
}

# Associate public IP with NAT Gateway

resource "azurerm_nat_gateway_public_ip_association" "main" {
  nat_gateway_id       = azurerm_nat_gateway.main.id
  public_ip_address_id = azurerm_public_ip.nat.id
}
```

## Step 2: Associate NAT Gateway with Subnets

```hcl
# Attach NAT Gateway to the subnet for internet-bound traffic that uses the default route
resource "azurerm_subnet_nat_gateway_association" "private_1" {
  subnet_id      = azurerm_subnet.private_1.id
  nat_gateway_id = azurerm_nat_gateway.main.id
}

resource "azurerm_subnet_nat_gateway_association" "private_2" {
  subnet_id      = azurerm_subnet.private_2.id
  nat_gateway_id = azurerm_nat_gateway.main.id
}
```

## Step 3: Multiple Public IPs for Higher Port Count

```hcl
# Each public IP adds 64,512 SNAT ports
resource "azurerm_public_ip" "nat_additional" {
  count = 3  # Total: 4 IPs x 64,512 = ~258,048 SNAT ports

  name                = "${var.project_name}-nat-pip-${count.index + 2}"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1"]
}

resource "azurerm_nat_gateway_public_ip_association" "additional" {
  count = 3

  nat_gateway_id       = azurerm_nat_gateway.main.id
  public_ip_address_id = azurerm_public_ip.nat_additional[count.index].id
}
```

## Step 4: NAT Gateway with Public IP Prefix

```hcl
# Use a contiguous IP range for easier allowlisting
resource "azurerm_public_ip_prefix" "nat" {
  name                = "${var.project_name}-nat-prefix"
  location            = var.location
  resource_group_name = var.resource_group_name
  prefix_length       = 30  # /30 = 4 IPs, /29 = 8 IPs, /28 = 16 IPs
  sku                 = "Standard"
  zones               = ["1"]
}

resource "azurerm_nat_gateway_public_ip_prefix_association" "main" {
  nat_gateway_id      = azurerm_nat_gateway.main.id
  public_ip_prefix_id = azurerm_public_ip_prefix.nat.id
}

output "nat_ip_range" {
  value       = azurerm_public_ip_prefix.nat.ip_prefix
  description = "Add this CIDR to external service allowlists"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify NAT Gateway configuration
az network nat gateway show \
  --resource-group <rg> \
  --name <nat-gateway-name> \
  --query "{State: provisioningState, IdleTimeout: idleTimeoutInMinutes}"

# From a VM in the associated subnet, verify outbound IP
curl https://ifconfig.me  # Should return the NAT Gateway public IP
```

## Conclusion

For new internet-bound connections that use the subnet's default route, NAT Gateway takes precedence over Load Balancer outbound rules and instance-level public IPs; a user-defined route to a virtual appliance or virtual network gateway still takes precedence. Use a Public IP Prefix when you need a contiguous outbound IP range for allowlisting with external partners-a `/29` prefix gives 8 consecutive IPs, and NAT Gateway uses the entire prefix range. Keep `idle_timeout_in_minutes = 4` for most workloads; only increase it for long-lived idle TCP connections that would otherwise be terminated mid-session. Standard NAT Gateway can be zonal or no-zone, while StandardV2 NAT Gateway is zone-redundant.
