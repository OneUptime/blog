# Validation Summary: How to Test Variable Validation Rules in OpenTofu - Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- OpenTofu test framework
- Input variable validation

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu custom conditions and input variable validation documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `can` function documentation: https://opentofu.org/docs/language/functions/can/
- OpenTofu `regex` function documentation: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `cidrnetmask` function documentation: https://opentofu.org/docs/language/functions/cidrnetmask/

## Issues Found
- The introduction described `expect_failures` as blocks. OpenTofu documents `expect_failures` as a list inside a `run` block, so the wording was corrected.
- The command example used `tofu test --test-directory=tests -verbose`. OpenTofu documents the option as `-test-directory=path`, so the command was corrected to `tofu test -test-directory=tests -verbose`.

## Review Notes
The HCL snippets for variable validation and `.tftest.hcl` run blocks match the documented OpenTofu test syntax. The local environment did not have the `tofu` binary installed, so validation was performed against official OpenTofu documentation rather than by executing `tofu test`.
