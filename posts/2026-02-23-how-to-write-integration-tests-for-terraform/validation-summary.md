# Validation Summary: How to Write Integration Tests for Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform test framework
- Terraform HCL test files (`.tftest.hcl`)
- Terraform `check` blocks
- AWS provider resources
- Amazon S3
- Amazon CloudFront
- AWS CLI Resource Groups Tagging API
- GitHub Actions

## Sources Consulted
- Terraform test command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform tests language reference: https://developer.hashicorp.com/terraform/language/tests
- Terraform check block reference: https://developer.hashicorp.com/terraform/language/block/check
- Terraform resource configuration and timeouts documentation: https://developer.hashicorp.com/terraform/language/resources/configure
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS CLI `resourcegroupstaggingapi get-resources` reference: https://docs.aws.amazon.com/cli/latest/reference/resourcegroupstaggingapi/get-resources.html

## Issues Found
- The S3 bucket name examples used raw `timestamp()` output, which returns an RFC 3339 timestamp containing characters such as colons that are not valid in S3 bucket names. Updated the examples to use `formatdate("YYYYMMDDhhmmss", timestamp())` via `format(...)` so generated names contain only S3-safe characters.
- The external checks section implied that `check` blocks could be used directly in the `.tftest.hcl` example. Terraform `check` blocks belong in the configuration under test, while test files execute runs and assertions. Updated the section to show a `check` block in `main.tf` and a separate apply-based test run.
- The timeout section used `terraform test -timeout=30m`, but the official `terraform test` command does not support a `-timeout` option. Replaced it with a resource `timeouts` block example for resources that support configurable operation timeouts.
- The GitHub Actions example pinned Terraform `1.7.0`, which is old relative to the current stable releases. Updated it to `1.15.4` from the official HashiCorp release index.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform test -help` output.
- The examples are module-dependent and assume matching resources, variables, outputs, providers, and required provider declarations exist in the configuration under test.
