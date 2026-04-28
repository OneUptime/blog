# Validation Summary: How to Configure NAT Gateway on Azure

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Azure NAT Gateway (Standard SKU)
- Azure Virtual Network (VNet) and subnets
- Azure Public IP / Public IP Prefix
- Azure CLI (`az network`)
- Terraform (`azurerm` provider)
- `curl`, `ifconfig.me`, `ipinfo.io` for outbound IP verification

## Sources Consulted
- [What is Azure NAT Gateway? — Microsoft Learn](https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview)
- [Reliability in Azure NAT Gateway — Microsoft Learn](https://learn.microsoft.com/en-us/azure/reliability/reliability-nat-gateway)
- [`az network nat gateway` CLI reference — Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway)

## Issues Found

1. **Incorrect maximum public IP count.** The overview claimed "up to 64 public IPs × 64K ports each = millions of SNAT ports." Microsoft's documentation states a NAT Gateway resource can use **up to 16 public IP addresses**, giving roughly 16 × 64,000 ≈ 1,024,000 SNAT ports. Updated to "up to 16 public IPs × 64K ports each = ~1 million SNAT ports."

2. **Incorrect zone-redundancy claim for Standard SKU.** The overview listed "Zone-redundant options for HA" as a feature without qualifying the SKU. Per Microsoft docs, Standard SKU NAT Gateway is **zonal** (or "no zone"); only the StandardV2 SKU is zone-redundant. Since the post's CLI/Terraform examples create Standard SKU resources, this was misleading. Updated the bullet to: "Availability zone options for HA — zonal with the Standard SKU, zone-redundant with the StandardV2 SKU."

3. **Incorrect portal availability zone option.** Step 3 in "Creating NAT Gateway in Azure Portal" listed "Availability zone: Zone-redundant or specific zone." For the Standard SKU NAT Gateway the portal options are **No Zone** (regional/nonzonal) or a specific zone (1, 2, or 3); zone-redundancy requires StandardV2. Updated to: "Availability zone: No Zone or a specific zone (1, 2, or 3) for Standard SKU; StandardV2 SKU is zone-redundant."

## Review Notes

- Azure CLI commands (`az network public-ip create`, `az network nat gateway create`, `az network vnet subnet update --nat-gateway`, `az network public-ip prefix create`, `az network nat gateway update --public-ip-prefixes`) all match the current CLI reference. `--idle-timeout` is correctly expressed in minutes (default 4, max 120 — applies to TCP only; UDP idle timeout is fixed at 4 min).
- Terraform resource names (`azurerm_public_ip`, `azurerm_nat_gateway`, `azurerm_nat_gateway_public_ip_association`, `azurerm_subnet_nat_gateway_association`) and `sku_name = "Standard"` are correct for the AzureRM provider.
- Public IP prefix length `/31` (2 IPs) is valid; allowed range for Azure public IP prefixes is `/28`–`/31` for IPv4.
- `203.0.113.1` is a valid TEST-NET-3 (RFC 5737) example address — appropriate for documentation.
- The post does not mention the newer **StandardV2 SKU** (zone-redundant, IPv6 support, 100 Gbps, flow logs), which Microsoft now recommends for production. A future revision could add a brief note or a side-by-side Standard vs. StandardV2 comparison, but this is a "could-improve," not an error.
- The post does not mention that NAT Gateway only supports TCP and UDP (ICMP is not supported). This omission isn't incorrect but could be useful to readers troubleshooting `ping` from a private VM.
