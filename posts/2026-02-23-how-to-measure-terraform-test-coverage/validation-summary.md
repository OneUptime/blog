# Validation Summary: How to Measure Terraform Test Coverage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform test files (`.tftest.hcl`)
- Terraform input variable validation
- Terraform output values
- Bash scripting
- Go
- GitHub Actions
- Dynamic Badges GitHub Action

## Sources Consulted
- Terraform Tests documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform `test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- Dynamic Badges GitHub Marketplace page: https://github.com/marketplace/actions/dynamic-badges
- Go standard library documentation for `os`, `path/filepath`, `regexp`, and `strings`: https://pkg.go.dev/std

## Issues Found
- The resource coverage script divided by zero when a module had no resources. Added a zero-resource guard before calculating the percentage.
- The Go example imported unused packages and referenced helper functions that were not defined. Removed the unused import and added helper implementations for scanning Terraform and test files, plus variable and output coverage calculations.
- The variable coverage script counted grep output incorrectly and could not detect `expect_failures` references as written. Updated the grep pipelines so they produce numeric counts.
- The output coverage script ran its counter updates inside a pipeline subshell and never printed a final coverage percentage. Reworked it to use process substitution and print `Output Coverage`.
- The output block example used `...`, which is not valid Terraform configuration syntax. Replaced the placeholders with valid `value` arguments.
- The coverage threshold script extracted the first number from `Resource Coverage: tested/total (percent%)`, which returned the tested-resource count instead of the percentage. Updated it to extract the parenthesized percentage.

## Review Notes
- Terraform and Go CLIs were not installed in the local environment, so Terraform and Go examples were reviewed against official documentation rather than executed locally.
- Bash snippets were extracted from the post and checked with `bash -n`.
- The coverage scripts use text matching and are useful as lightweight heuristics, but a production-grade tool should parse HCL with a Terraform-aware parser and inspect assertions more precisely.
