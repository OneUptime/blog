# Validation Summary: How to Use the Terraform Plugin Framework

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform Plugin SDKv2
- Terraform plugin protocol v5 and v6
- Go
- Terraform provider, resource, data source, schema, validator, default, and plan modifier APIs

## Sources Consulted
- HashiCorp Developer: Terraform Plugin Framework overview: https://developer.hashicorp.com/terraform/plugin/framework
- HashiCorp Developer: Plugin framework benefits: https://developer.hashicorp.com/terraform/plugin/framework-benefits
- HashiCorp Developer: Provider servers and protocol versions: https://developer.hashicorp.com/terraform/plugin/framework/provider-servers
- HashiCorp Developer: Schemas: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/schemas
- HashiCorp Developer: Data types and Terraform data concepts: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/types
- HashiCorp Developer: Configure provider client tutorial: https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework/providers-plugin-framework-provider-configure
- HashiCorp Developer: Default values: https://developer.hashicorp.com/terraform/plugin/framework/resources/default
- HashiCorp Developer: Plan modification: https://developer.hashicorp.com/terraform/plugin/framework/resources/plan-modification
- HashiCorp Developer: String attributes and validators: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/string
- Go package documentation: provider package: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/provider
- Go package documentation: resource package: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource
- Go package documentation: resource/schema package: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema
- Go package documentation: terraform-plugin-framework-validators stringvalidator package: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator

## Issues Found
- The post stated that the Plugin Framework "replaced" SDKv2 and provides strong typing through Go generics. Updated this to match HashiCorp's positioning: the framework is the recommended newer SDK, SDKv2 remains maintained for Terraform 1.x, and the framework uses framework value types and typed data models rather than Go generics as the central mechanism.
- The SDKv2 comparison claimed struct tags give compile-time verification that code matches schemas. Updated this because `tfsdk` struct tag/schema mismatches are reported during framework data conversion, not by the Go compiler.
- The protocol version discussion implied protocol v6 alone enables nested attributes and stricter type checking. Updated it to state that protocol v6 is the latest recommended plugin protocol and that the framework also supports protocol v5.
- The provider `Configure` example did not handle unknown provider configuration values before calling value accessors. Added `IsUnknown()` checks with attribute diagnostics, following HashiCorp's provider configuration tutorial.
- The provider configuration comment said environment variables were overrides, while the code actually defaults to environment variables and lets explicit Terraform configuration override them. Corrected the comment.
- The resource schema example used framework APIs without showing the required imports. Added current imports for `resource/schema`, defaults, plan modifiers, validators, and framework value types.
- The validator example imported an unused `listvalidator` package and omitted imports required by the snippet. Removed the unused import and added `regexp` and `validator`.
- The nested model structs were defined but not used by the resource model. Updated the resource model to map nested attributes to `NetworkConfigModel` and `[]DiskModel`.
- The optional resource interface examples omitted the embedded `Resource` interface. Added the embedded `Resource` member so the examples match the framework interface pattern.

## Review Notes
The post is technically relevant and broadly aligned with current HashiCorp guidance. The examples still use placeholder provider-specific functions such as `NewAPIClient`, `NewServerResource`, and `NewServerDataSource`, which is acceptable for an illustrative guide but would need concrete implementations in a runnable provider.
