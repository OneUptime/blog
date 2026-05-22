# Validation Summary: How to Define Provider Schema in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform Plugin SDKv2
- Terraform provider schemas
- Terraform resource schemas
- Go
- HCL

## Sources Consulted
- HashiCorp Terraform Plugin Framework providers documentation: https://developer.hashicorp.com/terraform/plugin/framework/providers
- HashiCorp Terraform Plugin Framework provider configuration tutorial: https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework/providers-plugin-framework-provider-configure
- HashiCorp Terraform Plugin Framework default attribute values documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/default
- HashiCorp Terraform Plugin Framework default value migration documentation: https://developer.hashicorp.com/terraform/plugin/framework/migrating/attributes-blocks/default-values
- HashiCorp Terraform Plugin Framework plan modification documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/plan-modification
- HashiCorp Terraform Plugin Framework attributes documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes
- HashiCorp Terraform Plugin SDKv2 schema behavior documentation: https://developer.hashicorp.com/terraform/plugin/sdkv2/schemas/schema-behaviors
- HashiCorp Terraform sensitive state best practices: https://developer.hashicorp.com/terraform/plugin/best-practices/sensitive-state
- HashiCorp Terraform Plugin Framework string attributes documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/string

## Issues Found
- The Plugin Framework provider schema example used resource-only `Default` handlers such as `int64default.StaticInt64` and `booldefault.StaticBool` on provider attributes. HashiCorp documents framework defaults as resource schema attribute behavior and says provider attribute defaults should be handled in `Configure`. Removed those provider-schema defaults and showed the defaulting in `Configure`.
- The Plugin Framework provider schema marked `api_url` and `api_key` as `Required` while also describing environment variable fallback. Framework provider examples use optional schema attributes when `Configure` resolves configuration from Terraform or environment variables. Changed those attributes to `Optional`.
- The Plugin Framework code block referenced `regexp` and `int64validator` without importing them. Added the missing imports.
- The resource schema section used the SDKv2 term `ForceNew` while the example used Plugin Framework replacement plan modifiers. Updated the wording to "replacement plan modifiers" and "nested attributes."
- The sensitive attribute guidance overstated what `Sensitive: true` does by implying it prevents exposure in logs and state diffs generally. Updated the guidance to say Terraform generally masks CLI output, does not change state storage, and provider code should avoid or mask sensitive log output.
- The "Resource Schema Patterns" heading was missing Markdown heading markup. Added the heading marker to keep the document structure correct.

## Review Notes
The remaining Go snippets are illustrative provider examples and still assume surrounding provider types, helper functions, imports, and custom plan modifiers exist in the reader's provider codebase. The Terraform Plugin Framework and SDKv2 APIs referenced are current and not deprecated in the checked HashiCorp documentation.
