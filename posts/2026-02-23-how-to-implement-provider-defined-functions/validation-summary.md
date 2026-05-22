# Validation Summary: How to Implement Provider-Defined Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform provider-defined functions
- Terraform Plugin Framework
- Terraform Plugin Testing
- Go
- HCL

## Sources Consulted
- HashiCorp Terraform Plugin Framework provider-defined functions overview: https://developer.hashicorp.com/terraform/plugin/framework/functions
- HashiCorp Terraform Plugin Framework function concepts: https://developer.hashicorp.com/terraform/plugin/framework/functions/concepts
- HashiCorp Terraform Plugin Framework function implementation: https://developer.hashicorp.com/terraform/plugin/framework/functions/implementation
- HashiCorp Terraform Plugin Framework function testing: https://developer.hashicorp.com/terraform/plugin/framework/functions/testing
- Terraform language functions documentation: https://developer.hashicorp.com/terraform/language/functions
- terraform-plugin-framework function package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/function
- terraform-plugin-framework types package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/types
- terraform-plugin-testing resource package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-testing/helper/resource
- terraform-plugin-testing knownvalue package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-testing/knownvalue

## Issues Found
- The opening description said provider-defined functions were only "relatively new" and implied data sources manage state and make API calls. Updated it to note Terraform 1.8+ support and clarified that data sources participate in Terraform state and commonly make API calls.
- The `ParseServerIDFunction` example used `attr.Type`, `attr.Value`, and `types.*` without importing the framework `attr` and `types` packages. Added the missing imports.
- The `JoinPathFunction` example did not include a `Metadata` method, so the shown type would not implement `function.Function`. Added `Metadata` with the `join_path` function name.
- The provider-function test used `resource.TestCheckOutput("test.prefix", ...)` style checks against fields inside an object output. Updated the example to use `ConfigStateChecks` with `statecheck.ExpectKnownOutputValueAtPath`, `tfjsonpath`, and `knownvalue.StringExact`, which matches the current testing package guidance for checking values at output paths.
- The provider-function tests omitted a Terraform version guard. Added `tfversion.SkipBelow(tfversion.Version1_8_0)` because provider-defined functions require Terraform 1.8 or later.

## Review Notes
The examples are illustrative snippets, so surrounding imports and test fixture definitions are still assumed. The remaining technical guidance aligns with current HashiCorp documentation: provider-defined functions are offline, pure computation exposed via `provider::<local-name>::function_name`, registered through `ProviderWithFunctions`, and tested with Terraform Plugin Testing.
