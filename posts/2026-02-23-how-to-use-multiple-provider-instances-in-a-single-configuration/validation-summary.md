# Validation Summary: How to Use Multiple Provider Instances in a Single Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform provider configuration
- Terraform provider aliases
- Terraform module provider passing
- AWS provider
- Google Cloud provider
- AzureRM provider

## Sources Consulted
- HashiCorp Terraform provider block reference: https://developer.hashicorp.com/terraform/language/block/provider
- HashiCorp Terraform provider meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/provider
- HashiCorp Terraform providers meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/providers
- HashiCorp Terraform providers within modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- HashiCorp AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- HashiCorp AWS provider aws_vpc_peering_connection_accepter resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_accepter
- HashiCorp Google provider google_storage_bucket resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- HashiCorp AzureRM provider azurerm_storage_account resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account

## Issues Found
- The Azure storage account example referenced `azurerm_resource_group.main.name` without defining `azurerm_resource_group.main` in the snippet. Added an `azurerm_resource_group` resource so the example has the referenced dependency.
- The dynamic provider configuration section said providers are resolved during initialization before resource evaluation. Terraform does install providers during initialization, but provider configuration associations are more specifically static and must be known while Terraform constructs the dependency graph. Updated the explanation to match Terraform's documented model.

## Review Notes
- Provider aliases, the `provider = aws.alias` syntax, module `providers` maps, and `configuration_aliases` usage match current Terraform documentation.
- The AWS provider 6.x documentation now supports per-resource `region` arguments for many regional resources, which can reduce the need for aliases in some multi-region AWS-only configurations. Provider aliases remain valid and are still relevant for multiple accounts, credentials, module mappings, and providers without equivalent per-resource region behavior.
- Example S3, GCS, and Azure Storage bucket/account names must still be globally unique in real deployments.
