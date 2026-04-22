# Validation Summary: How to Share OpenTofu Modules Across Cloud Providers

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu modules
- Terraform-compatible HCL
- OpenTofu module registry sources
- AWS provider VPC resource
- AzureRM provider virtual network resource

## Sources Consulted
- OpenTofu Modules documentation: https://opentofu.org/docs/language/modules/
- OpenTofu Module Sources documentation: https://opentofu.org/docs/v1.9/language/modules/sources/
- OpenTofu Standard Module Structure documentation: https://opentofu.org/docs/language/modules/develop/structure/
- OpenTofu Input Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu Output Values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu Version Constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu Registry page: https://opentofu.org/registry/
- AWS provider `aws_vpc` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc.html.markdown
- AzureRM provider `azurerm_virtual_network` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_network.html.markdown

## Issues Found
- The registry section said to "Push modules" and then showed a `module` block. A `module` block consumes or references an already published registry module; it does not publish or push a module. Updated the sentence to say that after publishing modules, callers reference them with a registry source address.

## Review Notes
- The module examples are illustrative fragments. The AWS and Azure output examples assume corresponding `aws_vpc.this` and `azurerm_virtual_network.this` resources are defined in the omitted `main.tf` files.
- OpenTofu's standard module structure recommends descriptions for variables and outputs. The post keeps declarations short for demonstration, which is acceptable for a concise guide but should be expanded in production modules.
