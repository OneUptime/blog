# Validation Summary: How to Write .tftest.hcl Files for OpenTofu Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu native test framework
- `.tftest.hcl` test files
- HCL
- OpenTofu CLI `tofu test`
- OpenTofu provider configuration and provider aliases
- OpenTofu mock providers

## Sources Consulted
- OpenTofu CLI `test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu 1.8 "What's new" documentation for provider mocking in `tofu test`: https://opentofu.org/docs/v1.8/intro/whats-new/
- OpenTofu 1.7 CLI `test` command documentation: https://opentofu.org/docs/v1.7/cli/commands/test/

## Issues Found
- The post said `run.command` defaults to `plan`. OpenTofu's official documentation states that `command` defaults to `apply`, so the comment was corrected to `apply (default) or plan`.
- The file structure section said `mock_provider` blocks are available in OpenTofu 1.7+. Official OpenTofu 1.8 documentation introduced provider mocking in `tofu test`, and the 1.7 test file structure does not include `mock_provider`, so this was corrected to OpenTofu 1.8+.
- The `expect_failures` example implied general resource failure testing by listing `aws_instance.web`. Official documentation says `expect_failures` is for input variable validation and custom conditions such as checks, preconditions, and postconditions, not provider validation failures. The example was updated to use `check.web`.
- The command example used `tofu test --filter=...`. Official OpenTofu documentation lists the option as `-filter=...`, so the command was updated to match the documented CLI form.

## Review Notes
- The current OpenTofu documentation also supports `.tofutest.hcl`, `.tftest.json`, and `.tofutest.json` test files. The post remains valid because it specifically focuses on `.tftest.hcl`, which is still supported.
- A local `tofu` binary was not available in the workspace, so CLI behavior was verified against official documentation rather than local `tofu test -help` output.
