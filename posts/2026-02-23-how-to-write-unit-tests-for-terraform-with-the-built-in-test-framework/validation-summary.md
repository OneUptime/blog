# Validation Summary: How to Write Unit Tests for Terraform with the Built-in Test Framework

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform test framework
- HCL
- Terraform CLI
- Terraform AWS provider examples

## Sources Consulted
- HashiCorp Developer: Terraform Tests - https://developer.hashicorp.com/terraform/language/tests
- HashiCorp Developer: Terraform Test Files - https://developer.hashicorp.com/terraform/language/files/tests
- HashiCorp Developer: terraform test command reference - https://developer.hashicorp.com/terraform/cli/commands/test
- HashiCorp Developer: Terraform Test Provider Mocking - https://developer.hashicorp.com/terraform/language/tests/mocking
- HashiCorp Blog: Terraform 1.6 adds a test framework for enhanced code validation - https://www.hashicorp.com/en/blog/terraform-1-6-adds-a-test-framework-for-enhanced-code-validation
- Terraform Registry: AWS provider aws_flow_log resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log

## Issues Found
- The description said the Terraform 1.6 test framework included mock providers. Mocking is available in Terraform 1.7.0 and later, so the description was changed to refer to plan-mode tests instead.
- The introduction implied that Terraform tests generally avoid deploying infrastructure. Terraform tests default to apply-mode and can create real infrastructure, so the sentence was narrowed to plan-mode tests.
- The unit-test explanation implied mock providers were part of the Terraform 1.6 behavior. It now notes that mock providers can be combined with plan-mode tests in Terraform 1.7 and later.
- The post stated that unit tests do not need cloud credentials. Plan-mode tests do not create infrastructure, but real providers or data sources may still require provider configuration or credentials, so the wording was corrected.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was verified against the official `terraform test` command documentation rather than local `--help` output.
