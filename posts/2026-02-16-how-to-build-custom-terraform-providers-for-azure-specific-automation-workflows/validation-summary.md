# Validation Summary: How to Build Custom Terraform Providers for Azure-Specific Automation Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform Plugin Framework
- Terraform Plugin Testing
- Go
- AzureRM Terraform provider
- Azure Resource Manager

## Sources Consulted
- HashiCorp Terraform Plugin Framework overview: https://developer.hashicorp.com/terraform/plugin/framework
- HashiCorp Plugin Framework provider implementation docs: https://developer.hashicorp.com/terraform/plugin/framework/providers
- HashiCorp Plugin Framework resource implementation docs: https://developer.hashicorp.com/terraform/plugin/framework/resources
- HashiCorp Plugin Framework resource configuration docs: https://developer.hashicorp.com/terraform/plugin/framework/resources/configure
- HashiCorp Plugin Framework default value docs: https://developer.hashicorp.com/terraform/plugin/framework/resources/default
- HashiCorp Plugin Framework plan modification docs: https://developer.hashicorp.com/terraform/plugin/framework/resources/plan-modification
- HashiCorp Plugin Framework acceptance testing docs: https://developer.hashicorp.com/terraform/plugin/framework/acctests
- HashiCorp Terraform CLI configuration and local provider mirror docs: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform provider requirements docs: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp AzureRM provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp AzureRM storage account docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- HashiCorp support note on AzureRM `features {}` requirement: https://support.hashicorp.com/hc/en-us/articles/23473898408339-Terraform-Error-Insufficient-features-blocks
- HashiCorp support note on AzureRM 4.x `subscription_id` requirement: https://support.hashicorp.com/hc/en-us/articles/40621007246099-Required-subscription-id-Error-in-Terraform-with-AzureRM
- Go package docs for Terraform Plugin Framework string defaults: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema/stringdefault

## Issues Found
- The provider and resource examples created a Go import cycle because `internal/provider` imported `internal/resources` and `internal/resources` imported `internal/provider` for the shared client type. Moved the shared client type into `internal/catalog` and updated the imports and project structure.
- The provider metadata stored a version but did not expose it. Added `resp.Version = p.version`, matching the Plugin Framework provider examples.
- The resource `Configure` method used a direct type assertion on provider data, which could panic. Replaced it with the Plugin Framework recommended checked type assertion and diagnostic error.
- The `classification` attribute was optional and computed, but the default was applied in `Create` instead of during planning. Added `stringdefault.StaticString("internal")` to the schema and removed the late null check.
- The computed `id` attribute did not preserve state for unknown planned values during updates. Added `stringplanmodifier.UseStateForUnknown()`.
- The local provider installation commands hard-coded `darwin_arm64` and built an unversioned binary. Updated the commands to use the current `GOOS_GOARCH` platform and the conventional `terraform-provider-azurecatalog_v0.1.0` binary name.
- The AzureRM example used an outdated `~> 3.85` constraint and omitted the required `features {}` provider block. Updated the example to AzureRM `~> 4.0`, added `features {}`, and set `subscription_id`.
- The storage account example referenced a resource group name without defining the resource group. Added an `azurerm_resource_group` and referenced its name and location.
- The acceptance test referenced `testAccProviderFactories` without defining it and omitted required provider configuration. Added the protocol v6 provider factory and a minimal provider block in the test configuration.
- The setup commands did not include the testing module used by the acceptance test. Added `go get github.com/hashicorp/terraform-plugin-testing`.
- The post described combining multiple Azure API calls into an "atomic" Terraform resource. Adjusted this to "behind a single Terraform resource" because Terraform does not make multi-API workflows atomic unless the underlying implementation provides that guarantee.

## Review Notes
The example still uses placeholder API behavior instead of real HTTP calls, which is appropriate for a tutorial using a hypothetical internal catalog. A production provider should add client error handling, import support where useful, validators for constrained fields, environment-variable fallbacks for credentials, and acceptance tests backed by an isolated test service or mockable API.
