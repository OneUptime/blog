# How to Configure NAT Gateway on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Azure, Cloud, IPv4

Description: Learn how to configure Azure NAT Gateway to give private subnet resources reliable outbound internet access with static public IP addresses.

## Azure NAT Gateway Overview

Azure NAT Gateway provides:
- **Outbound connectivity** for resources without public IPs
- **Static outbound IPs** - all outbound traffic appears from one or more known IPs
- **High scalability** - up to 16 public IPs × 64K ports each = ~1 million SNAT ports
- **Availability zone** options for HA - zonal with the Standard SKU, zone-redundant with the StandardV2 SKU

## Architecture

```text
Private Subnet (no public IPs)
  VM1, VM2, VM3 → NAT Gateway (Public IP: 203.0.113.1) → Internet
```

## Creating NAT Gateway in Azure Portal

1. Search for **NAT gateways** in the Azure Portal
2. Click **+ Create**
3. Configure:
   - Resource group: your-rg
   - Name: my-nat-gateway
   - Region: same as VNet
   - Idle timeout: 4 minutes (default)
   - Availability zone: No Zone or a specific zone (1, 2, or 3) for Standard SKU; StandardV2 SKU is zone-redundant
4. **Outbound IP**: Create or assign a Public IP or Public IP prefix
5. **Subnet**: Associate with your private subnet
6. Review and Create

## Creating NAT Gateway with Azure CLI

```bash
# Create a Public IP

az network public-ip create \
    --resource-group myRG \
    --name myNatGatewayIP \
    --sku Standard \
    --allocation-method Static

# Create NAT Gateway
az network nat gateway create \
    --resource-group myRG \
    --name myNatGateway \
    --public-ip-addresses myNatGatewayIP \
    --idle-timeout 4

# Associate with subnet
az network vnet subnet update \
    --resource-group myRG \
    --vnet-name myVNet \
    --name myPrivateSubnet \
    --nat-gateway myNatGateway
```

## Creating NAT Gateway with Terraform (Azure)

```hcl
resource "azurerm_public_ip" "nat" {
  name                = "nat-ip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_nat_gateway" "main" {
  name                    = "nat-gateway"
  location                = azurerm_resource_group.main.location
  resource_group_name     = azurerm_resource_group.main.name
  sku_name                = "Standard"
  idle_timeout_in_minutes = 4
}

resource "azurerm_nat_gateway_public_ip_association" "main" {
  nat_gateway_id       = azurerm_nat_gateway.main.id
  public_ip_address_id = azurerm_public_ip.nat.id
}

resource "azurerm_subnet_nat_gateway_association" "main" {
  subnet_id      = azurerm_subnet.private.id
  nat_gateway_id = azurerm_nat_gateway.main.id
}
```

## Verifying NAT Gateway Works

```bash
# From a private VM (no public IP), test outbound connectivity
# Using Azure Cloud Shell or SSH through a bastion/jump host:

curl -s https://ifconfig.me
# Should return the NAT Gateway's public IP

# Or from within the VM:
curl -s http://ipinfo.io/ip
```

## NAT Gateway vs Other Outbound Options

| Method | Static IP | Scale | Cost |
|--------|----------|-------|------|
| NAT Gateway | Yes | High | Moderate |
| Azure Firewall | Yes | High | High |
| Load Balancer outbound rules | Yes | Medium | Low + LB cost |
| Instance-level public IP | Per VM | Low | Low |

## Adding Multiple Public IPs or Prefix

```bash
# Add a public IP prefix (block of IPs) for more SNAT ports
az network public-ip prefix create \
    --resource-group myRG \
    --name myNatPrefix \
    --prefix-length 31  # 2 IPs

az network nat gateway update \
    --resource-group myRG \
    --name myNatGateway \
    --public-ip-prefixes myNatPrefix
```

## Key Takeaways

- Azure NAT Gateway provides consistent outbound IPs for private subnet resources.
- Associate a NAT Gateway with a subnet to route outbound traffic through it.
- Use a Public IP Prefix for multiple outbound IPs and higher SNAT port capacity.
- NAT Gateway replaces the need for public IPs on individual VMs for outbound access.

**Related Reading:**

- [How to Configure NAT on AWS VPC](https://oneuptime.com/blog/post/2026-03-20-nat-aws-vpc/view)
- [How to Configure Source NAT (SNAT) on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-snat-linux/view)
- [How to Scale NAT for Large Networks](https://oneuptime.com/blog/post/2026-03-20-scale-nat-large-networks/view)
