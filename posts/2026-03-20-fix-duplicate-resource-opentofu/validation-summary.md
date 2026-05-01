# Validation Summary: How to Fix 'Error: Duplicate Resource' in OpenTofu

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- OpenTofu
- HCL (HashiCorp Configuration Language / OpenTofu language)
- OpenTofu CLI (`tofu`)
- OpenTofu state refactoring (`state mv`, `moved`)

## Sources Consulted
- OpenTofu resource block syntax: https://opentofu.org/docs/language/resources/syntax/
- OpenTofu files and directories: https://opentofu.org/docs/language/files/
- OpenTofu module block syntax: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu refactoring and `moved` blocks: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu `state mv` command: https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu `validate` command: https://opentofu.org/docs/v1.9/cli/commands/validate/

## Issues Found
- The post originally said to remove the `moved` block immediately after `tofu apply`. OpenTofu documents removing `moved` blocks as a generally breaking change, and recommends retaining historical `moved` blocks unless you are certain all relevant states have already applied the refactor. I updated the `moved` block example and conclusion to reflect that behavior.

## Review Notes
- The post is technically relevant and contains actionable OpenTofu configuration and CLI examples, so it was reviewed as a code-focused troubleshooting guide.
- `tofu validate` is correctly recommended for catching duplicate declarations early, but OpenTofu requires the working directory to be initialized first, typically with `tofu init` or `tofu init -backend=false` for validation-only workflows.
- The local workspace did not have the `tofu` CLI installed, so command verification was performed against official OpenTofu documentation rather than live CLI output.
