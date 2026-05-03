# Validation Summary: How to Set Default Values for OpenTofu Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (input variables, defaults, validation blocks)
- HCL (HashiCorp Configuration Language)
- Terraform-compatible variable syntax
- AWS provider examples (aws_instance, aws_ami) used illustratively

## Sources Consulted
- OpenTofu Input Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu Local Values documentation: https://opentofu.org/docs/language/values/locals/
- OpenTofu CLI `tofu apply` reference (including `-var` and `-var-file` flags): https://opentofu.org/docs/cli/commands/apply/
- OpenTofu Custom Variable Validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- Terraform/OpenTofu type constraints (string, number, bool, list, map, object): https://opentofu.org/docs/language/expressions/types/

## Issues Found
No technical issues found.

- Variable block syntax with `type` and `default` arguments for primitive (string, number, bool) and complex (list, map, object) types is correct.
- The statement that a variable without a `default` is required is accurate per OpenTofu semantics.
- Use of `null` as a default to indicate "not specified" is valid OpenTofu behavior; the conditional `var.x != null ? var.x : fallback` pattern is idiomatic.
- The local-based environment defaults pattern (using a map keyed by environment) is sound and commonly used.
- `tofu apply`, `tofu apply -var="key=value"`, multi-line `-var` overrides, and `tofu apply -var-file="prod.tfvars"` are all valid CLI invocations.
- The note that default values must satisfy their own `validation` block conditions is accurate — OpenTofu evaluates validation against the effective value, including defaults.

## Review Notes
- The post mixes a `validation` block with a `default` that satisfies it, which is the correct pattern; readers should be aware that an invalid default will fail at plan time.
- The example referencing `data.aws_ami.latest.id` assumes a `data "aws_ami" "latest"` block exists elsewhere; this is implicit and fine for an illustrative snippet but isn't shown in the post.
- For more complex default scenarios with optional object attributes, OpenTofu also supports the `optional()` modifier inside `object({...})` types — out of scope for this introductory post but worth knowing.
- All examples remain accurate for current OpenTofu releases (1.x series).
