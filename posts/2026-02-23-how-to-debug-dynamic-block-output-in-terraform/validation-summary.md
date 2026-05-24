# Validation Summary: How to Debug Dynamic Block Output in Terraform

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL configuration language)
- `terraform plan`, `terraform console`, `terraform validate`, `terraform show` CLI subcommands
- Terraform dynamic blocks (`for_each`, `content`, `iterator`)
- AWS provider (`aws_security_group` resource used in examples)
- Terraform logging via `TF_LOG` environment variable
- `jq` for processing JSON plan output

## Sources Consulted
- HashiCorp Terraform docs — Dynamic Blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform docs — `terraform console`: https://developer.hashicorp.com/terraform/cli/commands/console
- HashiCorp Terraform docs — `terraform plan` and `-out` flag: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform docs — `terraform show -json` and JSON plan format: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Terraform docs — `terraform validate`: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp Terraform docs — Debugging / `TF_LOG`: https://developer.hashicorp.com/terraform/internals/debugging
- HashiCorp Terraform docs — `for_each` argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- AWS provider — `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
No technical issues found. The post correctly describes:
- Dynamic block iterator name defaults to the block label and can be overridden with `iterator = name` (unquoted reference).
- `terraform console` REPL behavior and output formatting for objects/maps using `=` between keys and values.
- The `type()` function is a console-only function for inspecting value types.
- `terraform show -json plan.tfplan` produces JSON with `planned_values.root_module.resources` containing the planned resource state.
- `terraform validate` runs without provider connections and supports `-json` for machine-readable output.
- `TF_LOG=TRACE` is a valid Terraform log level, and logs are written to stderr (so `2>debug.log` correctly captures them).
- `for_each` on a dynamic block accepts a list, set, or map.
- Common error categories ("Invalid for_each argument", "Unsupported block type", "Missing required argument") are accurately described as guidance even though Terraform's exact wording may vary slightly between versions.

## Review Notes
- The error message wording in the "Common Error Messages" section is approximate ("each.key/each.value in non-each context" is a paraphrase rather than the verbatim error string Terraform emits). This is acceptable for a guide that describes the category of error a reader is likely to encounter; future revisions could quote the exact strings from recent Terraform versions for added precision.
- The post references a related blog post at `https://oneuptime.com/blog/post/2026-02-23-how-to-avoid-common-dynamic-block-mistakes-in-terraform/view`. This is an internal cross-link to a sibling post — not verified externally, but follows the standard internal URL pattern used elsewhere in this blog.
- All examples use current (non-deprecated) Terraform syntax compatible with Terraform 1.x.
