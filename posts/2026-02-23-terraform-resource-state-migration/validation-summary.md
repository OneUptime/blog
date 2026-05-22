# Validation Summary: How to Implement Resource State Migration in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform Plugin SDKv2
- Terraform resource schema versioning
- Terraform resource state migration
- Go

## Sources Consulted
- HashiCorp Developer: Plugin Framework state upgrade documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/state-upgrade
- HashiCorp Developer: SDKv2 resource state migration documentation: https://developer.hashicorp.com/terraform/plugin/sdkv2/resources/state-migration
- Go package documentation for `terraform-plugin-framework/resource`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource
- HashiCorp Developer: Plugin Framework deprecations, removals, and renames: https://developer.hashicorp.com/terraform/plugin/framework/deprecations

## Issues Found
- The Plugin Framework Go example used `strings.SplitN` without importing `strings`. Added the missing import.
- The Plugin Framework migration examples converted missing or null optional state values into empty string or zero values. Updated the examples to use `types.StringNull()` and `types.Int64Null()` unless a prior value exists.
- The SDKv2 example used hand-written `cty.Object` types for prior schema versions. Replaced these with prior `schema.Resource` helpers and `CoreConfigSchema().ImpliedType()`, which matches the official SDKv2 guidance.
- The SDKv2 v0 upgrader migrated directly to the current schema while the surrounding text described chained SDKv2 migrations. Changed the v0 upgrader to produce v1-shaped state and let the v1 upgrader perform the rename and type conversion.
- The testing section expected the v0 SDKv2 upgrader to produce current-schema state and included an acceptance-test example that did not actually exercise old state migration. Updated the tests to validate the v0-to-v1 step and a v0-to-v2 unit chain.
- The multi-step migration section incorrectly described all Terraform provider migration APIs as chained one-version migrations. Clarified that SDKv2 chains `StateUpgraders`, while the Plugin Framework calls only the upgrader for the saved prior version and expects current-schema state.
- The attribute-removal guidance overstated that Terraform ignores extra state attributes. Reworded it to reference following the provider deprecation and removal process.

## Review Notes
The examples remain illustrative and omit surrounding provider boilerplate such as full resource model definitions, imports for the SDKv2 snippet, and real CRUD implementations. That is acceptable for the post's tutorial scope, but production provider tests should also include migration coverage against real saved prior-version state fixtures or prior provider binaries.
