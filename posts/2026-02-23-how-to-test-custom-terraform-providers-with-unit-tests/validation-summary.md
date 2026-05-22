# Validation Summary: How to Test Custom Terraform Providers with Unit Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform provider development
- Go unit testing
- Terraform provider validators
- Terraform provider plan modifiers
- Go test coverage tooling

## Sources Consulted
- Terraform Plugin Framework validator package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/schema/validator
- Terraform Plugin Framework planmodifier package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier
- Terraform Plugin Framework types package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/types
- Terraform Plugin Framework plan modification documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/plan-modification
- Terraform Plugin Development acceptance testing documentation: https://developer.hashicorp.com/terraform/plugin/testing/acceptance-tests
- Go command testing flags documentation: https://pkg.go.dev/cmd/go#hdr-Testing_flags

## Issues Found
- The plan modifier test example imported `github.com/hashicorp/terraform-plugin-framework/tfsdk` but did not use it. This would cause the Go compiler to fail with an unused import error. Removed the unused import.

## Review Notes
- The examples use placeholder provider functions, models, and API client packages such as `ValidPort`, `DefaultString`, `ServerResourceModel`, and `github.com/example/api-client`; these are reasonable illustrative placeholders, but readers would need to adapt them to their provider's actual package names and model definitions.
- The post correctly distinguishes unit tests from Terraform provider acceptance tests that require `TF_ACC`, provider credentials, and a Terraform CLI workflow.
