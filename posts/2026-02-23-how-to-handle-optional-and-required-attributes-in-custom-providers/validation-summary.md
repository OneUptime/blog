# Validation Summary: How to Handle Optional and Required Attributes in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
- Terraform Plugin Framework Validators (`github.com/hashicorp/terraform-plugin-framework-validators`)
- Go (provider development)
- Terraform schema design (Required/Optional/Computed/Sensitive flags)

## Sources Consulted
- Plugin Framework schema attribute docs: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes
- Plugin Framework default values (stringdefault/int64default/booldefault): https://developer.hashicorp.com/terraform/plugin/framework/resources/default
- Plugin Framework `resource.ConfigValidator` interface: https://developer.hashicorp.com/terraform/plugin/framework/resources/configure-validators
- terraform-plugin-framework-validators `resourcevalidator` package (`Conflicting`, `AtLeastOneOf`): https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework-validators/resourcevalidator
- `path.Root` / `path.MatchRoot` reference: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/path
- `types` package (StringNull/StringValue/Int64Null/Int64Value, MapValue.ElementsAs): https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/types

## Issues Found
No technical issues found.

## Review Notes
- The combinations table accurately reflects current Plugin Framework behavior; in fact, `Required: true` combined with `Computed: true` causes schema validation to fail, so calling it "Not typically used (contradictory)" is a reasonable simplification.
- In the optional-tags example, `plan.Tags.ElementsAs(ctx, &tags, false)` returns `diag.Diagnostics` that the snippet does not append to `resp.Diagnostics`. This is acceptable for a teaching snippet, but in production code those diagnostics should be appended so element-conversion errors surface to the user.
- The conditional-required validator implements the `resource.ConfigValidator` interface correctly (`Description`, `MarkdownDescription`, `ValidateResource(ctx, ValidateConfigRequest, *ValidateConfigResponse)`). The check on `IsNull/IsUnknown` for the condition path before comparing is the right pattern.
- The dynamic-default Create example correctly checks both `IsNull` and `IsUnknown` for an Optional+Computed attribute without a `Default`, which is necessary because such attributes arrive as unknown when unset.
- `path.Root` (returns `path.Path`) is used with `GetAttribute`, while `path.MatchRoot` (returns `path.Expression`) is used with `resourcevalidator.Conflicting`/`AtLeastOneOf`. Both usages match the expected argument types.
- All default-helper functions referenced (`stringdefault.StaticString`, `int64default.StaticInt64`, `booldefault.StaticBool`) exist in the corresponding `resource/schema/*default` packages.
