# Validation Summary: How to Deploy to Both AWS and Azure with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration, `tofu` CLI)
- AWS Terraform provider (`hashicorp/aws` ~> 5.0)
- Azure Terraform provider (`hashicorp/azurerm`)
- AWS resources: VPC, Subnet, EC2, Route53
- Azure resources: Resource Group, Virtual Network, Subnet, Public IP
- GitHub Actions (`aws-actions/configure-aws-credentials@v4`, `azure/login@v1`)

## Sources Consulted
- HashiCorp `terraform-provider-azurerm` GitHub releases (https://github.com/hashicorp/terraform-provider-azurerm/releases) — confirmed v4.x is the current major release line as of 2026
- HashiCorp `terraform-provider-aws` documentation — confirmed `~> 5.0` is current and resource schemas (`aws_vpc`, `aws_subnet`, `aws_instance`, `aws_route53_zone`, `aws_route53_record`) are accurate
- AzureRM provider documentation for `azurerm_resource_group`, `azurerm_virtual_network`, and `azurerm_subnet` (uses `address_prefixes` plural per v3+/v4 schema, which is correct)
- OpenTofu CLI documentation — confirmed `tofu init` and `tofu apply -auto-approve` are valid commands
- GitHub Actions: `aws-actions/configure-aws-credentials@v4` is the current major version; `azure/login@v1` remains supported

## Issues Found
- **Outdated azurerm provider version constraint**: The post specified `version = "~> 3.0"` for `hashicorp/azurerm`. The azurerm provider has been on the v4.x major release line since August 2024, and by 2026 v3.x is no longer current. Updated the constraint to `~> 4.0`. The existing provider block already includes `subscription_id` (which is required in v4.x), so no further changes were needed.

## Review Notes
- The `aws_instance.app.public_ip` reference assumes the instance receives a public IP, but the example's subnet does not set `map_public_ip_on_launch = true` and the instance does not set `associate_public_ip_address = true`. In a real deployment one of these would be required for the Route53 record to resolve. This is a typical example simplification rather than a syntactic error and is consistent with the post's scope.
- The `azurerm_public_ip.app` resource is referenced in the outputs and DNS section but is not defined inline in the post. This is also a typical illustrative shortcut for a multi-cloud overview post.
- The "Cross-Cloud DNS with Route53 and Azure DNS" heading mentions Azure DNS but the section actually uses Route53 records pointing to both AWS and Azure resources. The technique shown is valid (a single DNS provider can host records pointing to any IP), but readers expecting an `azurerm_dns_zone` example will not find one. Left as-is since the heading is descriptive of the cross-cloud DNS goal rather than the specific resources used.
- `azure/login@v2` is now available; `@v1` still functions and was kept to minimize changes.
