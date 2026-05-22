# Validation Summary: How to Implement Computed Attributes in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform Plugin Framework
- Go
- Terraform provider schema design
- Terraform plan modifiers

## Sources Consulted
- HashiCorp Terraform Plugin Framework: Plan modification: https://developer.hashicorp.com/terraform/plugin/framework/resources/plan-modification
- HashiCorp Terraform Plugin Framework: String attributes: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/string
- HashiCorp Terraform Plugin Framework: Access state, configuration, and plan data: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/accessing-values
- HashiCorp Terraform Plugin Framework: Default values: https://developer.hashicorp.com/terraform/plugin/framework/resources/default
- HashiCorp Terraform Plugin Framework: Terraform data concepts: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/terraform-concepts
- Go package documentation for `resource/schema/planmodifier`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier
- OneUptime linked related post: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-optional-and-required-attributes-in-custom-providers/view
- OneUptime linked related post: https://oneuptime.com/blog/post/2026-02-23-how-to-implement-plan-modification-in-custom-providers/view

## Issues Found
- The custom `unknownOnChangeModifier` example did not implement the `Description` and `MarkdownDescription` methods required by the `planmodifier.String` interface. Added both methods so the example satisfies the current Terraform Plugin Framework interface.
- The custom plan modifier checked create operations using `req.StateValue.IsNull()` and did not account for destroy plans. Updated it to check `req.State.Raw.IsNull()` for creates and `req.Plan.Raw.IsNull()` for destroys, matching the framework's documented operation checks.
- The custom plan modifier ignored diagnostics returned by `GetAttribute`. Updated the example to append diagnostics and return on errors.
- The provider-configuration default example set a default whenever the planned value was null or unknown. That can incorrectly override an unknown user-supplied configuration value. Updated it to read configuration separately and only set the provider default when `config.Region.IsNull()`.

## Review Notes
The examples are illustrative snippets rather than a complete provider implementation, so imports, resource interface declarations, and surrounding schema definitions are intentionally omitted. The technical guidance now aligns with the current Terraform Plugin Framework behavior around computed attributes, unknown values, defaults, and plan modification.
