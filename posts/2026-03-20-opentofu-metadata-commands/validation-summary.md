# Validation Summary: How to Use tofu metadata Commands

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu CLI (`tofu metadata functions`, `tofu providers schema`)
- jq (JSON processing for shell pipelines)
- Bash scripting

## Sources Consulted
- [OpenTofu Functions Metadata documentation](https://opentofu.org/docs/internals/functions-meta/)
- [OpenTofu `providers schema` Command documentation](https://opentofu.org/docs/cli/commands/providers/schema/)
- [OpenTofu Provider Requirements (provider source addresses)](https://opentofu.org/docs/language/providers/requirements/)
- [OpenTofu JSON Output Format](https://opentofu.org/docs/internals/json-format/)

## Issues Found
- **Incorrect claim that `tofu metadata functions` produces human-readable output without `-json`.** The original post showed `tofu metadata functions` (without flags) producing an excerpt of `abs(number) number`-style human-readable signatures. Per the official OpenTofu docs, the `-json` flag is a *required* option for `tofu metadata functions`, so the command will not produce human-readable output. I rewrote the introductory section to state that `-json` is required and replaced the fake human-readable output excerpt with the actual error behavior when the flag is omitted. The subsequent JSON example block was already correct and was left unchanged.

## Review Notes
- The `format_version` "1.0" and the JSON structure (`function_signatures` map with `description`, `return_type`, and `parameters` per function, where each parameter has `name` and `type`) all match the documented schema.
- The `tofu providers schema -json` examples use the correct top-level structure (`provider_schemas` → `<source>` → `resource_schemas` → `<resource>` → `block.attributes`).
- The provider source address `registry.opentofu.org/hashicorp/aws` is the correct fully-qualified form; `hashicorp/aws` is shorthand for that same address on the OpenTofu registry.
- The post does not mention the `variadic_parameter` field that can also appear in a function signature; this is an optional addition to consider in the future, but not a technical error.
