# Validation Summary: How to Test Terraform State Operations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform import blocks
- Terraform moved blocks
- Terraform test framework
- Terratest for Go
- AWS provider examples
- Bash scripting

## Sources Consulted
- Terraform CLI import documentation: https://developer.hashicorp.com/terraform/cli/import
- Terraform import block reference: https://developer.hashicorp.com/terraform/language/block/import
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform state command overview: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform state mv command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform state replace-provider command reference: https://developer.hashicorp.com/terraform/cli/commands/state/replace-provider
- Terraform moved block reference: https://developer.hashicorp.com/terraform/language/block/moved
- Terraform module refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform test framework documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform removed block and state removal documentation: https://developer.hashicorp.com/terraform/language/block/removed and https://developer.hashicorp.com/terraform/language/state/remove
- Terratest Terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform

## Issues Found
- The front matter description mentioned "replacements", but the article covers imports, moves, and removals. Changed it to "removals" to match the content.
- The Bash examples handled Terraform plan exit codes `0` and `2`, but not exit code `1`, which Terraform documents as an error when `-detailed-exitcode` is used. Added error handling so failed plans do not silently continue.
- The Terraform native test example switched between two alternate module sources without a shared `state_key`. Terraform creates separate in-memory state files for different alternate modules by default, so the refactored module would not necessarily operate on the state from the original module. Added the same `state_key` to both runs.
- The common pitfalls section said provider moves need a `-provider` flag. Current `terraform state mv` documentation does not include a `-provider` option. Replaced the guidance with a note that `state mv` does not change provider bindings and that `terraform state replace-provider` is used for provider source address changes.

## Review Notes
The examples are illustrative and assume fixture modules, AWS resources, and local state files exist. Terraform was not installed in the local workspace, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
