# Validation Summary: How to Create a NAT Gateway for IPv4 Outbound Connectivity in Azure

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Azure NAT Gateway
- Azure Virtual Network (VNet) and subnets
- Azure Public IP addresses (Standard SKU)
- Azure Public IP Prefixes
- Azure CLI (`az network` command group)
- IPv4 SNAT (Source Network Address Translation)

## Sources Consulted
- [What is Azure NAT Gateway? - Microsoft Learn](https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview)
- [NAT Gateway resource - Microsoft Learn](https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-resource)
- [Manage NAT Gateway - Microsoft Learn](https://learn.microsoft.com/en-us/azure/nat-gateway/manage-nat-gateway)
- [Azure CLI: az network nat gateway](https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway)
- [Azure CLI: az network public-ip prefix](https://learn.microsoft.com/en-us/cli/azure/network/public-ip/prefix)
- [Azure CLI: az network vnet subnet](https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet)
- [Public IP address prefix - Microsoft Learn](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-address-prefix)
- [Standard Load Balancer outbound connections](https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections)
- [Azure REST API: NAT Gateways - Get](https://learn.microsoft.com/en-us/rest/api/virtualnetwork/nat-gateways/get)
- [Azure CLI Issue #26326: --nat-gateway null detach behavior](https://github.com/Azure/azure-cli/issues/26326)

## Issues Found
No technical issues found.

All Azure CLI commands, flags, and parameter values were verified against the official Microsoft Learn documentation and CLI reference:
- `az network public-ip create` with `--sku Standard --allocation-method Static` is the correct invocation for a NAT Gateway-eligible public IP.
- `az network nat gateway create` accepts `--public-ip-addresses` and `--public-ip-prefixes` (mutually exclusive in single-prefix flow), and `--idle-timeout` (in minutes).
- `az network vnet subnet update --nat-gateway <name>` correctly attaches a NAT gateway.
- `az network vnet subnet update --remove natGateway` is the working detach syntax (the documented `--nat-gateway ""` / null form is broken per Azure CLI issue #26326, and `--remove natGateway` is the community-confirmed working approach).
- `az network public-ip prefix create --prefix-length 31` is valid; Azure public IP prefixes support `/28` through `/31` (16 down to 2 addresses).
- The 64,512 SNAT ports per public IP claim is correct.
- The `publicIpAddresses` JMESPath property name (camelCase with lowercase 'p' in 'Ip') matches the ARM REST API output.
- NAT Gateway's Standard SKU public IP requirement is correctly stated.

## Review Notes
- **Idle timeout range**: The post's table shows 4 minutes (default) and 30 minutes as examples. Both are valid. For completeness, the actual configurable maximum for TCP idle timeout is 120 minutes (UDP is fixed at 4 minutes and not user-configurable). The post is not inaccurate — it just shows two example values rather than the full range.
- **Load Balancer comparison row**: The "1,024–64,512" SNAT port range cited for Load Balancer outbound is reasonable as a documented range across default allocation tiers and outbound rules; Microsoft sometimes documents the per-IP maximum as 64,000, but 64,512 is also widely cited.
- **NAT Gateway scale**: The post correctly notes "64,512 SNAT ports per public IP" and that scaling is automatic. It could optionally mention that a single NAT Gateway supports up to 16 public IPs (yielding ~1,032,192 SNAT ports total), but this is an enhancement, not a correction.
- **Zone considerations**: The post does not discuss availability zone placement of the public IP / NAT Gateway, which can be operationally important. This is informational, not an error.
