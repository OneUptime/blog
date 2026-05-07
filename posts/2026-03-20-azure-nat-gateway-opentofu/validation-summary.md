# Validation Summary: How to Create Azure NAT Gateway with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure NAT Gateway
- Azure Virtual Network
- Azure Public IP
- Azure Public IP Prefix
- Azure CLI
- HashiCorp `azurerm` provider

## Sources Consulted
- Microsoft Learn: Azure NAT Gateway overview - https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview
- Microsoft Learn: Azure NAT Gateway resource - https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-resource
- Microsoft Learn: Reliability in Azure NAT Gateway - https://learn.microsoft.com/en-us/azure/reliability/reliability-nat-gateway
- Microsoft Learn: Public IP address prefix - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-address-prefix
- Microsoft Learn: Manage a public IP address with a NAT gateway - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/configure-public-ip-nat-gateway
- Microsoft Learn: Azure CLI `az network nat gateway` - https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway?view=azure-cli-lts
- Terraform Registry: `azurerm_nat_gateway` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/nat_gateway
- Terraform Registry: `azurerm_public_ip` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Terraform Registry: `azurerm_public_ip_prefix` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip_prefix
- Terraform Registry: `azurerm_subnet_nat_gateway_association` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_nat_gateway_association

## Issues Found
- The description and introduction overstated NAT Gateway behavior by implying zone redundancy as a general property and by framing SNAT exhaustion as fully eliminated. I changed this to distinguish StandardV2 zone redundancy from the Standard SKU used in the sample and to describe NAT Gateway as reducing SNAT exhaustion risk.
- The Step 1 comments used inaccurate zone wording for Standard NAT Gateway and Standard public IP resources. I corrected the comments to reflect current Azure availability-zone behavior.
- The Step 2 subnet-association comment said all outbound traffic uses NAT Gateway. I corrected it to reflect Azure's actual precedence rules for internet-bound traffic that uses the subnet's default route.
- The Step 3 additional public IPs omitted `zones = ["1"]` even though the sample NAT Gateway is a zonal Standard SKU gateway in zone 1. I added the matching zone to keep the public IP resources aligned with the NAT Gateway configuration.
- The Step 4 comment implied the public IP prefix example replaced individual IPs, while the code actually adds a prefix association. I corrected the wording to describe the real behavior.
- The conclusion incorrectly stated that NAT Gateway overrides all other outbound methods and that NAT Gateway is not zone-redundant. I updated it to reflect route precedence and the current Standard vs. StandardV2 SKU model.

## Review Notes
- The sample remains valid as a Standard SKU NAT Gateway example. If zone redundancy is a hard requirement, use `sku_name = "StandardV2"` together with matching `StandardV2` public IP or public IP prefix resources.
- Azure NAT Gateway supports any combination of public IP addresses and public IP prefixes up to 16 total IPs. The sample stays within that limit as written, but readers should keep that cap in mind if they increase the prefix size or add more IPs.
