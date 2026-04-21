# Validation Summary: How to Test Variable Validation Rules in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- OpenTofu test framework
- HCL variable validation
- OpenTofu CLI

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu input variable documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu custom condition checks documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `cidrnetmask` function documentation: https://opentofu.org/docs/language/functions/cidrnetmask/
- OpenTofu arithmetic and logical operators documentation: https://opentofu.org/docs/language/expressions/operators/
- OpenTofu type constraints and primitive conversion documentation: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu 1.11.6 CLI help output for `tofu test -help`.

## Issues Found
- The `tofu test tests/variable_validation.tftest.hcl -verbose` command used an undocumented positional test-file argument. OpenTofu's documented way to run a specific test file is the `-filter=` option, so the command was changed to `tofu test -filter=tests/variable_validation.tftest.hcl -verbose`.
- The `/8` and `/28` CIDR test names and comments described prefix lengths ambiguously. `/8` is a shorter prefix length than `/16`, while `/28` is a longer prefix length than `/24`. The run names and inline comments were updated to use `prefix_too_short` and `prefix_too_long` wording.

## Review Notes
The validation blocks, `run` blocks, `variables` blocks, `command = plan`, `expect_failures`, and `mock_provider` syntax match current OpenTofu documentation. I also tested the variable validation examples in a temporary OpenTofu 1.11.6 module without provider mocking; all 13 validation runs passed. In a real AWS-backed VPC module, `mock_provider "aws"` is appropriate, but provider plugins may still need to be initialized before running tests.
