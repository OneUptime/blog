# Validation Summary: How to Implement Plan Modification in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform provider development
- Go
- Resource schema defaults
- Attribute and resource-level plan modification

## Sources Consulted
- HashiCorp Terraform Plugin Framework plan modification documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/plan-modification
- HashiCorp Terraform Plugin Framework default values documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/default
- Go package documentation for `resource/schema/planmodifier`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier
- Go package documentation for `resource/schema/stringplanmodifier`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier
- Go package documentation for `resource.ModifyPlanRequest` and `resource.ModifyPlanResponse`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource
- Referenced OneUptime validation provider guide: https://oneuptime.com/blog/post/2026-02-23-how-to-implement-validation-in-custom-providers/view
- Referenced OneUptime nested schemas provider guide: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-nested-schemas-in-custom-providers/view

## Issues Found
1. **Default values were described as plan modifiers**: The Terraform Plugin Framework applies schema defaults during planning, immediately before computed null attributes are marked unknown and before attribute plan modifiers run. Updated the introduction, bullet list, lifecycle, and default-values section to distinguish schema defaults from plan modifiers.
2. **Planning lifecycle was oversimplified**: The original lifecycle skipped the framework-specific ordering for defaults, computed unknown marking, attribute plan modifiers, and resource-level `ModifyPlan`. Updated the ordered list to match the official plan modification process.
3. **Default-values code snippet had incorrect imports**: The snippet referenced `resource.SchemaRequest` without importing `resource` and imported unused plan modifier packages. Added the `resource` import and removed unused imports.
4. **Custom string plan modifiers did not guard against unknown values**: The conditional replacement and immutable examples could call `ValueString()` or compare values when plan/config values were unknown. Added null and unknown checks before making replacement decisions or returning immutable-attribute diagnostics.
5. **Creation detection used attribute nullness instead of resource state**: The conditional replacement and immutable examples checked `req.StateValue.IsNull()` to infer creation. Updated them to use `req.State.Raw.IsNull()`, which is the framework-documented way to detect resource creation in plan modifiers.
6. **Resource-level derived value example did not guard against null values**: The `ModifyPlan` example checked for unknown `name` and `region` values but not null values before building `fqdn`. Added null checks to prevent deriving an invalid value from absent inputs.
7. **Resource-level plan modification heading was malformed**: The text was missing Markdown heading syntax. Updated it to `## Resource-Level Plan Modification`.

## Review Notes
- The built-in plan modifier examples for `RequiresReplace`, `RequiresReplaceIfConfigured`, and `UseStateForUnknown` match current framework APIs.
- The custom conditional replacement example could also be implemented with the built-in `RequiresReplaceIf` helper, but the custom implementation is valid as an educational example.
- The article does not pin a Terraform Plugin Framework version. The reviewed APIs are current in the official documentation available on 2026-05-22.
