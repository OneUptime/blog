# Validation Summary: How to Write Negative Tests for OpenTofu Configurations - Configurations

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- OpenTofu (native testing framework, `.tftest.hcl` files)
- HCL (HashiCorp Configuration Language)
- AWS provider (`aws_instance`, `aws_ami` data source) used as illustrative examples
- `tofu test` CLI

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu language documentation for `expect_failures`, `mock_provider`, and `mock_data` blocks
- OpenTofu/Terraform built-in function reference for `contains`, `startswith`
- OpenTofu lifecycle `precondition` and `postcondition` documentation

## Issues Found
No technical issues found.

Verified items:
- `expect_failures = [var.<name>]`, `expect_failures = [<resource>.<name>]`, and `expect_failures = [data.<type>.<name>]` are all valid forms accepted by OpenTofu's test framework.
- `run` blocks with `command = plan`, `variables { ... }`, and `assert { ... }` blocks match the documented `.tftest.hcl` schema.
- `mock_provider "aws" { mock_data "aws_ami" { defaults = { ... } } }` uses the documented nested syntax for mock providers.
- `startswith(string, prefix)` is a valid built-in function returning a bool.
- `lifecycle { precondition { condition = ... error_message = ... } }` and `postcondition { ... }` are valid for resources and data sources respectively, and `self.<attr>` is the documented way to reference the surrounding object inside a postcondition.
- `tofu test` CLI flags `-filter=<path>` and `-verbose` are documented and current.
- Variable `validation { condition = ... error_message = ... }` syntax is correct.

## Review Notes
- The title contains the word "Configurations" twice ("...OpenTofu Configurations - Configurations"). This appears to be a stylistic/title-formatting quirk rather than a technical inaccuracy, so it was left as-is per the instruction not to make stylistic changes.
- OpenTofu also supports a `condition` attribute in `expect_failures` more recent versions, plus newer features like `override_resource` for tests; the post sticks to the broadly supported subset, which is appropriate for a tutorial.
- The example `expect_failures = [aws_instance.web]` triggers the precondition before any apply because `command = plan`, which is correct — preconditions run during planning. Likewise, postconditions on data sources are evaluated during the read step, so the mock-based postcondition example is plausible.
