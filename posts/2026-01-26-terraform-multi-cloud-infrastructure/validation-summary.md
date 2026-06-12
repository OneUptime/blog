# Validation Summary: How to Deploy Multi-Cloud Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform AzureRM provider
- Terraform Google Cloud provider
- AWS VPC, Site-to-Site VPN, and Route 53
- Azure Virtual Network and VPN Gateway
- Google Cloud VPC networking
- Multi-cloud networking and DNS-based traffic routing

## Sources Consulted
- Terraform AWS provider documentation for `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider documentation for `aws_vpn_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform AWS provider documentation for `aws_vpn_connection_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection_route
- Terraform AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform AzureRM provider documentation for `azurerm_virtual_network_gateway`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- Terraform AzureRM provider documentation for `azurerm_virtual_network_gateway_connection`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- Terraform Google provider documentation for `google_compute_network`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Terraform Google provider documentation for `google_compute_subnetwork`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Amazon Route 53 weighted routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- Amazon Route 53 alias vs. non-alias record documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Azure VPN Gateway configuration documentation: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpn-gateway-settings
- Terraform CLI workspace command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/new

## Issues Found
- The Azure networking module did not define a `GatewaySubnet`, but the VPN gateway example referenced `module.azure_network.gateway_subnet_id`. Azure VPN gateways must use a subnet named `GatewaySubnet`, so I added an `azurerm_subnet` named `GatewaySubnet` to the Azure network module snippet.
- The AWS static VPN example set `static_routes_only = true` but did not define a static VPN route. I added an `aws_vpn_connection_route` for the Azure VNet CIDR so AWS has the required remote route on the VPN connection.
- The Route 53 weighted routing example mixed an alias `A` record and a `CNAME` record with the same name. Weighted Route 53 records in a set must use the same name and type, and a CNAME cannot coexist with another record type at the same name. I changed the AWS endpoint record to a weighted `CNAME` record with the same TTL style as the Azure endpoint.
- The Route 53 health check example used quoted numeric values for `failure_threshold` and `request_interval`. I changed them to numeric values to match the provider schema and official examples.
- The AzureRM provider version constraint used `~> 3.0` while the provider configuration already included `subscription_id`, which is required for plan/apply in current AzureRM v4 usage. I updated the version constraint to `~> 4.0`.

## Review Notes
The snippets are still tutorial examples rather than a complete runnable repository: module output blocks, route table propagation/associations, credentials, and production-grade VPN redundancy are intentionally outside the scope of the post. Future improvements could show explicit module outputs for values such as `vpc_id`, `resource_group_name`, and `gateway_subnet_id`.
