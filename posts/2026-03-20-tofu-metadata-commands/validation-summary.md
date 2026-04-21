# Validation Summary: How to Use tofu metadata Commands - Tofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- `tofu metadata functions`
- `tofu providers schema`
- `jq`
- OpenTofu language tooling

## Sources Consulted
- OpenTofu Functions Metadata documentation: https://opentofu.org/docs/internals/functions-meta/
- OpenTofu `providers schema` command documentation: https://opentofu.org/docs/cli/commands/providers/schema/
- OpenTofu Basic CLI Features documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu VS Code extension documentation: https://github.com/opentofu/vscode-opentofu
- OpenTofu v1.11.0 CLI binary from official GitHub releases: https://github.com/opentofu/opentofu/releases/tag/v1.11.0

## Issues Found
- `tofu metadata functions` was shown without `-json` and with a table output. OpenTofu currently requires `-json` for this command, so the command and sample output were corrected to JSON.
- The `jq` examples treated function metadata as an array with `.name`, `.category`, and `.params` fields. The actual output is an object with a `function_signatures` map, so the filters were updated to use `keys[]`, direct function lookup, `parameters`, and `variadic_parameter`.
- The post described function categories such as `encoding` and `ipnet`, but those category fields are not present in the metadata output. The examples now search function names instead.
- The provider schema example omitted `.block` before `.attributes`. The schema path was corrected to `.resource_schemas["aws_instance"].block.attributes`.
- The IDE tooling list named `terraform-ls`. For OpenTofu-specific tooling, the official language server is `tofu-ls`, so the reference was updated.

## Review Notes
Validated the corrected `tofu metadata functions -json` and `jq` examples against OpenTofu v1.11.0. Also initialized a temporary OpenTofu project with the `hashicorp/random` provider to confirm the provider schema key format and `.block.attributes` path.
