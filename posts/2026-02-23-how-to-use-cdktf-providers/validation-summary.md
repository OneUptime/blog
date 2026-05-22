# Validation Summary: How to Use CDKTF Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- CDK for Terraform (CDKTF)
- Terraform providers
- AWS provider
- AzureRM provider
- Google Cloud provider
- Datadog provider
- TypeScript
- npm

## Sources Consulted
- HashiCorp CDKTF Providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- Terraform provider configuration reference: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform provider meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/provider
- Terraform version constraints reference: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform AWS provider documentation and generated CDKTF TypeScript package metadata: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AzureRM provider 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Terraform Google provider configuration reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- npm package metadata for @cdktf/provider-aws, @cdktf/provider-azurerm, and @cdktf/provider-google

## Issues Found
- The post said each CDKTF provider is distributed as a pre-built npm or PyPI package. HashiCorp documents pre-built providers as available for many popular providers, while other providers use generated bindings. Updated the wording to distinguish pre-built packages from generated bindings.
- The `cdktf.json` provider version examples used older provider major versions for AWS, AzureRM, and Google. Updated them to current major-version examples for AWS 6.x, AzureRM 4.x, and Google 7.x.
- The multi-cloud AzureRM provider example omitted `subscriptionId`. AzureRM v4 requires a subscription ID for plan/apply unless supplied from supported environment or CLI configuration. Added `subscriptionId` to the example.
- The provider version constraint examples referenced AWS 5.x after the version snippets were updated. Updated the explanatory examples to AWS 6.x while preserving the same Terraform constraint semantics.

## Review Notes
HashiCorp's current CDKTF documentation states that CDK for Terraform was deprecated on December 10, 2025 and is no longer supported or maintained by HashiCorp. The examples were still validated against the current published CDKTF provider package APIs and Terraform provider documentation.
