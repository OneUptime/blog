# Validation Summary: How to Use tofu providers to List Required Providers - Tofu List

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu providers
- Provider schemas
- Provider mirrors
- Provider dependency lock files
- Terraform/OpenTofu HCL
- jq

## Sources Consulted
- OpenTofu CLI documentation: `tofu providers` - https://opentofu.org/docs/cli/commands/providers/
- OpenTofu CLI documentation: `tofu providers schema` - https://opentofu.org/docs/cli/commands/providers/schema/
- OpenTofu CLI documentation: `tofu providers mirror` - https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu CLI documentation: `tofu providers lock` - https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu CLI documentation: `tofu init` - https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI documentation: `tofu validate` - https://opentofu.org/docs/cli/commands/validate/
- OpenTofu dependency lock file documentation - https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu provider configuration documentation - https://opentofu.org/docs/language/providers/configuration/
- OpenTofu v1.11.6 CLI local verification for `tofu providers` and `tofu providers schema -json` output shape

## Issues Found
- The `jq` example for required resource attributes used `.resource_schemas["aws_instance"].attributes`, but OpenTofu's schema JSON stores resource attributes under `.resource_schemas["aws_instance"].block.attributes`. Updated the path so the command matches the documented schema representation.
- The multiple provider configurations example claimed both provider aliases appear separately in `tofu providers` output. OpenTofu reports provider requirements there, not each aliased provider configuration. Updated the example comment and output to show the provider requirement once.

## Review Notes
- `tofu init -plugin-dir=/path/to/mirror/directory` is valid as a one-time filesystem mirror override; OpenTofu documentation recommends CLI provider installation configuration for routine mirror use.
- `tofu validate` checks configuration syntax and internal consistency locally and does not access remote provider APIs or state.
