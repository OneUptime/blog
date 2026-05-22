# Validation Summary: How to Implement Validation in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform Plugin Framework
- terraform-plugin-framework-validators
- Go
- Terraform provider resource validation
- Terraform resource plan modification

## Sources Consulted
- HashiCorp Terraform Plugin Framework validation documentation: https://developer.hashicorp.com/terraform/plugin/framework/validation
- HashiCorp Terraform Plugin Framework resource configuration validation documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/validate-configuration
- HashiCorp Terraform Plugin Framework resource plan modification documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/plan-modification
- Go package documentation for `github.com/hashicorp/terraform-plugin-framework/resource`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource
- Go package documentation for `github.com/hashicorp/terraform-plugin-framework/resource/schema`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema
- Go package documentation for `github.com/hashicorp/terraform-plugin-framework/schema/validator`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/schema/validator
- Go package documentation for `github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator
- Go package documentation for `github.com/hashicorp/terraform-plugin-framework-validators/int64validator`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework-validators/int64validator
- Go package documentation for `github.com/hashicorp/terraform-plugin-framework-validators/resourcevalidator`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework-validators/resourcevalidator

## Issues Found
- The metadata description mentioned plan modifiers even though the post was centered on validators. I changed it to reference attribute validators, config validators, and custom validation logic.
- The post described errors as being caught during "the plan phase" only. Framework validation also runs for `terraform validate` and other validation RPC contexts, so I changed the wording to "during validation and planning."
- The validation mechanism list used the vague term "schema validators" for cross-attribute validation. I changed it to "config validators," matching the Terraform Plugin Framework resource `ConfigValidators` terminology.
- The list described "plan-time validation" as a validation type. HashiCorp documents plan modification as the correct place to return diagnostics when configured provider data is needed, so I changed this to "plan modification diagnostics."
- The cross-attribute validation snippet labeled `resourcevalidator.AtLeastOneOf` as a conflict validator. I corrected the comment because `AtLeastOneOf` requires at least one matching value; `resourcevalidator.Conflicting` is the conflict validator.
- The custom config validator did not account for unknown values before reading boolean/string values and used a resource-level diagnostic for an attribute-specific error. I added unknown-value checks and changed the missing certificate diagnostic to `AddAttributeError(path.Root("certificate_path"), ...)`.
- The external API validation example used an attribute validator with an API client. HashiCorp documents that configuration validation runs offline before resource configuration, so a configured API client should be used from resource plan modification instead. I replaced the example with a `ModifyPlan` implementation that reads config, handles unknown/null values, and reports an attribute diagnostic.
- The test snippet printed `response.Diagnostics.Errors()` with `%s`, which produces poor formatting for a slice. I changed it to `%v`.

## Review Notes
The code examples are partial snippets and omit surrounding imports/types such as `context`, `regexp`, `url`, `fmt`, `strings`, `types`, `path`, `resourcevalidator`, and `tflog`. That is acceptable for the post format, but a future revision could make the examples fully standalone.
