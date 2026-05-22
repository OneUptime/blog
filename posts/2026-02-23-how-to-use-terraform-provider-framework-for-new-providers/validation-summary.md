# Validation Summary: How to Use Terraform Provider Framework for New Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform provider development
- Terraform CLI provider installation overrides
- Go
- Terraform HCL

## Sources Consulted
- Terraform Plugin Framework overview: https://developer.hashicorp.com/terraform/plugin/framework
- Terraform Plugin Framework provider servers: https://developer.hashicorp.com/terraform/plugin/framework/provider-servers
- Terraform Plugin Framework providers: https://developer.hashicorp.com/terraform/plugin/framework/providers
- Terraform Plugin Framework provider configuration tutorial: https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework/providers-plugin-framework-provider-configure
- Terraform Plugin Framework resources: https://developer.hashicorp.com/terraform/plugin/framework/resources
- Terraform Plugin Framework resource import: https://developer.hashicorp.com/terraform/plugin/framework/resources/import
- Terraform Plugin Framework plan modification: https://developer.hashicorp.com/terraform/plugin/framework/resources/plan-modification
- Terraform Plugin Framework paths: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/paths
- Terraform CLI configuration file and dev_overrides: https://developer.hashicorp.com/terraform/cli/config/config-file
- Go package documentation for framework resource helpers: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource
- Go package documentation for framework paths: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/path

## Issues Found
- The provider configuration snippet used `path.Root(...)` after the correction pattern was needed for attribute diagnostics, but the provider imports did not include `github.com/hashicorp/terraform-plugin-framework/path`. Added the import.
- The provider configuration snippet converted `types.String` values with `ValueString()` without first checking for unknown values. Official Plugin Framework guidance checks unknown provider configuration values before client creation to avoid silently building a client from incomplete configuration. Added `IsUnknown()` diagnostics for `api_url` and `api_key`.
- The resource snippet imported `fmt` but did not use it, which would cause a Go compile error. Removed the unused import.
- The resource snippet called `path.Root("id")` in `ImportState` but did not import `github.com/hashicorp/terraform-plugin-framework/path`, which would cause a Go compile error. Added the missing import.

## Review Notes
The post remains a high-level example and references placeholder API client functions/types such as `APIClient` and `NewAPIClient`; those are acceptable in context but would need concrete implementations in a runnable provider repository. The local `dev_overrides` example is accurate for Terraform v0.14 and later, and HashiCorp documentation recommends using development overrides only temporarily during provider development.
