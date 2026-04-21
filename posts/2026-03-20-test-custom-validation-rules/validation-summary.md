# Validation Summary: How to Test Custom Validation Rules in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- OpenTofu input variable validation blocks
- OpenTofu test files (`*.tftest.hcl`)
- `tofu test` CLI

## Sources Consulted
- OpenTofu Docs: Custom Conditions - https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Docs: Input Variables - https://opentofu.org/docs/language/values/variables/
- OpenTofu Docs: Command: test - https://opentofu.org/docs/cli/commands/test/
- OpenTofu Docs: `cidrhost` Function - https://opentofu.org/docs/language/functions/cidrhost/
- OpenTofu Docs: `can` Function - https://opentofu.org/docs/language/functions/can/
- OpenTofu Docs: `contains` Function - https://opentofu.org/docs/language/functions/contains/

## Issues Found
- The description said the post covered validation for OpenTofu variables and outputs, but the post only shows input variable `validation` blocks. Changed it to "input variables" to match OpenTofu terminology and the actual examples.
- The introduction implied all variable validation rules run before any resources are created. OpenTofu evaluates custom conditions as early as possible, but conditions that depend on unknown values can be deferred until apply. Removed the overly broad timing claim.
- The CIDR validation used `can(cidrhost(var.cidr_block, 0))` while the error message said "IPv4 CIDR block." OpenTofu's `cidrhost` accepts both IPv4 and IPv6 prefixes, so the message was changed to "valid CIDR block."
- The negative test cases for `environment` and `cidr_block` omitted the required `instance_count` variable. Added valid `instance_count` values so each test isolates the intended validation failure.
- The invalid test runs omitted `command = plan`. Since `tofu test` defaults to apply, added `command = plan` to the failure tests to match the variable-validation testing pattern in the official docs and avoid accidental apply behavior.

## Review Notes
- The `tofu test` and `tofu test -filter=tests/validation.tftest.hcl` commands match the official `tofu test` CLI documentation.
- The local environment does not have the `tofu` binary installed, so syntax was verified against official OpenTofu documentation rather than by executing `tofu test`.
