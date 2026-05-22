# Validation Summary: How to Use Mock Providers in Terraform Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform test framework
- Terraform mock providers
- Terraform provider mocking blocks: `mock_provider`, `mock_resource`, and `mock_data`
- Terraform override behavior
- HashiCorp AWS, Random, TLS, and Kubernetes providers

## Sources Consulted
- HashiCorp Terraform documentation: Tests - Provider Mocking: https://developer.hashicorp.com/terraform/language/tests/mocking
- HashiCorp Terraform documentation: Tests - Configuration Language: https://developer.hashicorp.com/terraform/language/tests
- HashiCorp Terraform CLI documentation: `terraform test` command: https://developer.hashicorp.com/terraform/cli/commands/test
- HashiCorp Terraform Registry: Random provider overview: https://registry.terraform.io/providers/hashicorp/random/latest/docs
- HashiCorp Terraform Registry: `random_id` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/id

## Issues Found
- The post said computed mock attributes get synthetic values without explaining Terraform's default timing. HashiCorp documents that generated values are produced during apply by default and appear as known after apply during plan. I added the `override_during = plan` caveat where plan-only tests need computed values.
- The "Overriding Mock Data" example used `mock_data "aws_instance"` for a resource type. Terraform requires `mock_resource` for resources and `mock_data` for data sources, so I changed that block to `mock_resource "aws_instance"`.
- A section heading referred to `override_data` while the section explained `mock_data`. I changed the heading to `mock_data` to match the actual Terraform block being demonstrated.
- The mixed-provider example claimed `random_id` generates a real value in plan mode. The Random provider generates random values when resources are created, so I changed the test run to `command = apply` and updated the comment.
- The limitations section said mocked data sources return configured data or empty defaults. HashiCorp documents Terraform-generated values for computed attributes, so I corrected that wording.

## Review Notes
Terraform CLI was not installed in the workspace, so I could not run `terraform test` locally. The review was completed against current official HashiCorp documentation.
