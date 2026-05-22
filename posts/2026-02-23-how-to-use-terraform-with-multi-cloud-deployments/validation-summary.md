# Validation Summary: How to Use Terraform with Multi-Cloud Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- AzureRM provider for Terraform
- Google Cloud provider for Terraform
- Terraform remote state and S3 backend
- Cross-cloud VPN networking

## Sources Consulted
- Terraform language resource syntax: https://developer.hashicorp.com/terraform/language/resources/syntax
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform remote state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_vpn_connection` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- AWS provider `aws_vpn_connection_route` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection_route
- AzureRM provider `azurerm_linux_virtual_machine` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- AzureRM provider `azurerm_virtual_network_gateway` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- AzureRM provider `azurerm_virtual_network_gateway_connection` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- Google provider `google_compute_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The AWS compute example referenced `data.aws_ami.latest.id` without defining the `aws_ami` data source. Added a matching Ubuntu AMI data source so the reference is valid.
- The Azure Linux VM example referenced `azurerm_network_interface.main[0].id`, but that resource was not shown in the module. Changed the example to accept `var.azure_network_interface_id`, which keeps the abstraction focused and avoids an invalid undeclared resource reference.
- The Azure Linux VM example did not include SSH key authentication. Added an `admin_ssh_key` block using `var.azure_ssh_public_key`, matching the AzureRM Linux VM authentication requirements.
- The cross-cloud VPN example created AWS and Azure gateway resources but did not create the AWS static route or the Azure gateway connection. Added `aws_vpn_connection_route` and `azurerm_virtual_network_gateway_connection` resources so the example actually establishes the intended route-based site-to-site connection.
- The VPN example did not explicitly share the same pre-shared key between AWS and Azure. Added `tunnel1_preshared_key = var.vpn_shared_key` on the AWS VPN connection and `shared_key = var.vpn_shared_key` on the Azure connection.

## Review Notes
Terraform CLI is not installed in the review environment, so `terraform fmt` and `terraform validate` could not be run locally. The snippets were reviewed against official Terraform and provider documentation. The article still uses provider version constraints from the original post; they are valid for the examples, but future maintenance could consider testing against newer major provider versions.
