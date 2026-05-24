# Validation Summary: How to Handle Breaking Changes in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform Plugin Framework (github.com/hashicorp/terraform-plugin-framework)
- Go
- Resource state upgraders / state migration
- Provider deprecation strategies

## Sources Consulted
- HashiCorp Terraform Plugin Framework — State Upgrade docs: https://developer.hashicorp.com/terraform/plugin/framework/resources/state-upgrade
- HashiCorp Terraform Plugin Framework — Attribute handling/deprecation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes
- Terraform Plugin Framework source (`resource/schema/string_attribute.go`, `resource/schema/schema.go`, `resource/state_upgrader.go`) on github.com/hashicorp/terraform-plugin-framework
- pkg.go.dev reference for `resource.StateUpgrader`, `resource.UpgradeStateRequest`, and `schema.StringAttribute`

## Issues Found
- **Incorrect field name `DeprecatedMessage`** on `schema.StringAttribute`. The Plugin Framework field is `DeprecationMessage` (verified in `resource/schema/string_attribute.go` and the public documentation). Fixed by renaming the field in the deprecation snippet so it now matches the resource-level `DeprecationMessage` usage shown later in the post.

## Review Notes
- The `UpgradeStateRequest.State` field is technically `*tfsdk.State` (a pointer), but the calling convention `req.State.Get(ctx, &priorState)` in the post is still correct since Go method calls on pointers are transparent here.
- The `StateUpgrader` struct fields (`PriorSchema *schema.Schema`, `StateUpgrader func(...)`) and the `UpgradeState(ctx) map[int64]resource.StateUpgrader` interface signature shown are correct for the current Plugin Framework API.
- `Schema.Version` is correctly an `int64` and incrementing it triggers the state upgrade path — accurately described.
- `Optional: true` + `Computed: true` on the new `cpu`/`memory` attributes is a valid combination and appropriate for attributes that can be user-set or computed.
- The `default` arm of `convertSizeToCPUMemory` silently returns `(1, 1024)`, which masks unexpected size values. Returning an error or surfacing a diagnostic from the upgrader would be more defensive, but this is a stylistic suggestion, not a technical error.
- The test example uses `name, tc := name, tc` loop-variable shadowing, which is unnecessary on Go 1.22+ (per-iteration loop variables) but harmless and still required for older Go versions.
