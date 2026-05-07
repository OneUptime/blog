# Validation Summary: How to Configure Azure Application Gateway with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Application Gateway v2
- Azure Web Application Firewall (WAF)
- Azure Virtual Network dual-stack IPv4/IPv6 networking
- Azure CLI
- Terraform `azurerm` provider
- IPv6 client testing with `curl`

## Sources Consulted
- Microsoft Learn: Configure Application Gateway with a frontend public IPv6 address using the Azure portal - https://learn.microsoft.com/en-us/azure/application-gateway/ipv6-application-gateway-portal
- Microsoft Learn: Azure Application Gateway frontend IP address configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-frontend-ip
- Microsoft Learn: Azure Application Gateway infrastructure configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure
- Microsoft Learn: Create an Azure virtual machine with a dual-stack network - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-vm-dual-stack-ipv6-portal
- Microsoft Learn: Deploy IPv6 dual stack application - https://learn.microsoft.com/en-us/azure/load-balancer/deploy-ipv4-ipv6-dual-stack-standard-load-balancer
- Microsoft Learn: `az network public-ip` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-lts
- Microsoft Learn: CRS and DRS rule groups and rules - https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/application-gateway-crs-rulegroups-rules
- Terraform Registry: `azurerm_application_gateway` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_gateway
- Terraform Registry: `azurerm_public_ip` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip

## Issues Found
- The Azure CLI example used invalid IPv6 address prefixes: `fd00:agw::/48` and `fd00:agw:0:1::/64` are not legal IPv6 notation. They were corrected to valid dual-stack example prefixes.
- The CLI workflow assumed the resource group already existed. `az group create` was added so the command sequence works from a clean starting point.
- The post said the Application Gateway subnet "must be /24 or larger." Azure's current guidance is that `/24` is strongly recommended for v2 deployments, but it is not a hard requirement. The wording was corrected accordingly.
- The Terraform snippet defined only HTTP listeners, but the test section attempted an HTTPS request. The unused port 443 block and the HTTPS test were removed so the example matches the configuration being deployed.
- The WAF test URL contained literal spaces, which makes the URL invalid for `curl`. The SQL injection probe was URL-encoded and the expected `403` result was clarified.
- The WAF explanation was too broad for IPv6. It was updated to note that WAF protection applies to IPv4 and IPv6 client traffic, but some IPv6 WAF custom rule match conditions remain unsupported.

## Review Notes
- Azure documents that existing IPv4-only Application Gateways can't be upgraded in place to dual stack; IPv6 support requires creating a new dual-stack gateway.
- Azure also documents that IPv6 backend addresses are not currently supported, so keeping the backend pool IPv4-only is correct.
- The Terraform WAF example uses `OWASP` `3.2`, which remains supported. Microsoft currently recommends `Microsoft_DefaultRuleSet` `2.2` for new WAF policies, but the post's corrected example is still valid.
