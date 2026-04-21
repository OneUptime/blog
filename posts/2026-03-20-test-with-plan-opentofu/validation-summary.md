# Validation Summary: How to Test with Plan in OpenTofu Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- `tofu test`
- OpenTofu test files (`*.tftest.hcl` / `*.tofutest.hcl`)
- Mock providers
- Plan and apply test modes
- OpenTofu custom conditions

## Sources Consulted
- OpenTofu documentation: `tofu test` command and test file syntax, including `run.command`, `expect_failures`, `plan_options`, providers, mock providers, and generated mock values: https://opentofu.org/docs/cli/commands/test/
- OpenTofu documentation: custom conditions, input variable validation, preconditions, postconditions, and when conditions are evaluated: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu documentation: OpenTofu 1.8 provider mocking announcement and examples: https://opentofu.org/docs/v1.8/intro/whats-new/

## Issues Found
- The post said `command = plan` is the default and can be omitted. OpenTofu's current `tofu test` documentation says `command` defaults to `apply`, so the comment was corrected to state that `command = plan` must be set explicitly.
- The post implied plan-mode tests are generally credential-free and suitable for CI without credentials. OpenTofu plan-mode tests avoid creating resources, but fully offline or credential-free tests require mock providers or provider/offline configuration. The introduction, decision table, and conclusion were tightened to reflect that.
- The "Testing Variable Validation with Plan" section used `expect_failures = [aws_db_instance.main]`, which matches a resource precondition example rather than a direct input variable validation example. The section title and lead-in sentence were changed to describe preconditions accurately.

## Review Notes
The remaining examples use documented OpenTofu test constructs, including `run` blocks, `variables` blocks, `assert` blocks, `expect_failures`, `mock_provider`, and `mock_resource` defaults. Mock providers were introduced in OpenTofu 1.8, so readers on older OpenTofu versions would need to upgrade before using those examples.
