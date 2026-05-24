# Validation Summary: How to Handle Complex Nested Schemas in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
- Go (struct modeling with `tfsdk` tags)
- HCL (HashiCorp Configuration Language) syntax for nested attributes vs blocks

## Sources Consulted
- Terraform Plugin Framework — Schemas: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/schemas
- Terraform Plugin Framework — Attribute types: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes
- Terraform Plugin Framework — SingleNestedAttribute: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/single-nested
- Terraform Plugin Framework — ListNestedAttribute: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/list-nested
- Terraform Plugin Framework — SetNestedAttribute: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/set-nested
- Terraform Plugin Framework — Blocks: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/blocks
- Terraform Plugin Framework — Accessing State, Config, and Plan: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/accessing-values

## Issues Found
No technical issues found.

All schema types referenced (`SingleNestedAttribute`, `ListNestedAttribute`, `SetNestedAttribute`, `MapNestedAttribute`, `SingleNestedBlock`, `ListNestedBlock`, `SetNestedBlock`) exist in the Plugin Framework's `resource/schema` package. The `NestedObject: schema.NestedAttributeObject{...}` pattern is the correct way to declare nested attribute structure. The Go model patterns with `types.String`, `types.Int64`, `types.Bool`, `types.List`, and `tfsdk` struct tags are accurate. The CRUD example using `req.Plan.Get(ctx, &plan)`, `ValueString()`, `ValueInt64()`, `IsNull()`, and `resp.State.Set(ctx, &plan)` matches the framework's documented APIs. HashiCorp's recommendation to prefer nested attributes over blocks for new providers is correct.

## Review Notes
- The HCL example uses `network_config = { ... }` for the attribute form and `network_config { ... }` for the block form — this distinction is correctly represented.
- The post notes `SingleNestedAttribute` represents "an object with named attributes (exactly one)" — this is slightly ambiguous wording (the attribute exists once, not that it requires exactly one nested attribute), but the meaning is conveyed correctly in context and the code examples are unambiguous.
- The `assign_public_ip` attribute is marked `Optional: true, Computed: true` with a description noting it defaults to false. In practice, populating a default value also requires a `Default: booldefault.StaticBool(false)` plan modifier from `resource/schema/booldefault` — the post does not show this, but does not claim the default is automatic either. Future authors may want to add a brief note about default plan modifiers, but this is not an error.
- Similarly for `interval` (defaults to 30) and `healthy_threshold` (defaults to 3) — the defaults would need `int64default.StaticInt64(...)` plan modifiers to actually take effect. Not strictly incorrect but worth noting for completeness.
- The link to two related posts at the bottom uses the `oneuptime.com/blog/post/...` URL pattern consistent with other validated posts in this series.
