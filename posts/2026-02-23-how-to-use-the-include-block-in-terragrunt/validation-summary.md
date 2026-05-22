# Validation Summary: How to Use the include Block in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform / OpenTofu
- HCL configuration
- Infrastructure as Code

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt v0.32.0 release notes: https://newreleases.io/project/github/gruntwork-io/terragrunt/release/v0.32.0

## Issues Found
- The post described `no_merge` as the default for most blocks and said the child completely overrides the parent. Terragrunt's include-level `merge_strategy` defaults to `shallow`; `no_merge` means the included parent is not merged. Updated the headings and explanation accordingly.
- The named include example referenced `include.root.inputs.state_bucket` without `expose = true`, and `state_bucket` was not defined in the earlier root input example. Terragrunt only exposes included config values through the `include` variable when `expose` is enabled. Added `expose = true`, changed the reference to the already-defined `project` input, and adjusted the surrounding comment.

## Review Notes
Terragrunt currently supports multiple include blocks in a single child configuration, but nested include blocks are still not supported. The examples in this post use multiple includes from one child config and do not show nested includes, so they are valid.
