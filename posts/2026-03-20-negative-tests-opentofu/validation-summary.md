# Validation Summary: How to Write Negative Tests for OpenTofu Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (native test framework, `.tftest.hcl` files)
- HCL (variable validation, lifecycle preconditions/postconditions)
- AWS provider (illustrative resources: `aws_lb`, `aws_instance`)
- `mock_provider` for hermetic test runs

## Sources Consulted
- OpenTofu test command documentation: https://opentofu.org/docs/cli/commands/test/
- HashiCorp Terraform tests documentation: https://developer.hashicorp.com/terraform/language/tests
- OpenTofu language docs on custom conditions (validation blocks, pre/postconditions, check blocks)

## Issues Found
- **Removed the "Testing Type Constraints" section.** The example claimed that assigning a number to a string-typed variable could be caught with `expect_failures = [var.name]`. This is technically incorrect. Per the Terraform/OpenTofu test framework documentation, `expect_failures` only catches user-defined custom conditions (validation blocks, preconditions, postconditions, check blocks). Type mismatches detected by OpenTofu's built-in type system are explicitly excluded — the docs state: *"Other kinds of failure besides the specified expected failures in the checkable object still result in the overall test failing. For example, a variable that expects a boolean value as input fails the surrounding test if Terraform provides the wrong kind of value, even if that variable is included in an `expect_failures` attribute."* The example in the post would not work as described, so the section was removed rather than left in place to mislead readers.

## Review Notes
- The remaining sections — variable validation rules, postcondition on `aws_lb.main`, and mutually-exclusive variable preconditions on `aws_instance.main` — all use correct `tftest.hcl` syntax: `mock_provider "aws" {}`, `run "name" { ... }`, `command = plan` (unquoted), `variables { ... }` block, and `expect_failures` referencing checkable objects (`var.<name>`, `<resource_type>.<name>`).
- The section "Testing Check Blocks (Postconditions)" conflates two distinct OpenTofu features: top-level `check` blocks and resource `lifecycle.postcondition` blocks. The example uses `postcondition`, which is functional, so this is a labelling nuance rather than a technical error.
- Semantically, the ALB example uses a `postcondition` to validate an input variable (`var.subnet_ids`). A `precondition` would be more idiomatic since the value is an input rather than something computed by the resource — but the code is valid HCL and will execute correctly during `plan`.
