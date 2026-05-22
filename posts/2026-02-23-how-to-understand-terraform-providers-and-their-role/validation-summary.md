# Validation Summary: How to Understand Terraform Providers and Their Role

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform providers
- Terraform Registry
- HashiCorp Configuration Language (HCL)
- AWS provider
- Google Cloud provider
- AzureRM provider
- Kubernetes provider
- Terraform Plugin Framework
- Terraform CLI

## Sources Consulted
- Terraform Registry provider overview and provider tiers: https://developer.hashicorp.com/terraform/registry/providers
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform dependency graph internals: https://developer.hashicorp.com/terraform/internals/graph
- Terraform `providers schema` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers/schema
- Terraform Plugin Framework provider server documentation: https://developer.hashicorp.com/terraform/plugin/framework/provider-servers
- AWS provider documentation on Terraform Registry: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AzureRM virtual machine resource documentation on Terraform Registry: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine
- Terraform Registry provider search and tier filters: https://registry.terraform.io/search/providers

## Issues Found
- The post said Terraform Registry providers fall into three categories. Current Terraform Registry documentation describes additional tiers, including Partner Premier and Archived. Updated the wording to say providers are grouped into several tiers and added brief entries for Partner Premier and Archived providers.
- The post said providers handle dependencies between resources. Terraform core builds and walks the dependency graph, while providers perform operations when Terraform calls them. Reworded the section to clarify that Terraform handles dependency ordering before calling providers.

## Review Notes
- Terraform CLI is not installed in the local environment, so CLI commands were verified against official Terraform command documentation rather than local `terraform --help` output.
- The Terraform examples are illustrative and rely on placeholder values such as AMI IDs, project IDs, resource group names, and omitted Azure VM settings. The syntax and resource/data source concepts are technically accurate for their intended explanatory purpose.
