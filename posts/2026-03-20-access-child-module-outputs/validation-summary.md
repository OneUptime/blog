# Validation Summary: How to Access Child Module Outputs in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL configuration language
- OpenTofu modules and outputs
- OpenTofu CLI
- AWS resource examples

## Sources Consulted
- OpenTofu docs: Output Values - https://opentofu.org/docs/language/values/outputs/
- OpenTofu docs: Module Blocks - https://opentofu.org/docs/language/modules/syntax/
- OpenTofu docs: Module Composition - https://opentofu.org/docs/language/modules/develop/composition/
- OpenTofu docs: References to Named Values - https://opentofu.org/docs/v1.9/language/expressions/references/
- OpenTofu docs: Splat Expressions - https://opentofu.org/docs/language/expressions/splat/
- OpenTofu docs: `tofu output` - https://opentofu.org/docs/cli/commands/output/
- OpenTofu docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `tofu state list` - https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu docs: `tofu state show` - https://opentofu.org/docs/v1.9/cli/commands/state/show/

## Issues Found
- The introduction implied that sibling modules consume each other's outputs directly. I changed this to state that child module outputs are used by the parent module and then passed to other child modules, which matches OpenTofu's module encapsulation model.
- The `public_subnet_ids` output example used `value = [aws_subnet.public[*].id]`, which would create a nested list rather than the flat list shown in the comment. I changed it to `value = aws_subnet.public[*].id`.
- The debugging section described `tofu output` as showing module outputs directly and suggested `tofu plan` renders outputs. I corrected the comments to reflect that `tofu output` shows root outputs, including any child outputs re-exposed by the root module, and that `tofu plan` is useful for reviewing downstream resource effects rather than rendering outputs.

## Review Notes
- No deprecated OpenTofu syntax was found in the post after the corrections.
- `tofu` was not installed in the local workspace, so CLI verification was done against the official OpenTofu command documentation rather than local `--help` output.
