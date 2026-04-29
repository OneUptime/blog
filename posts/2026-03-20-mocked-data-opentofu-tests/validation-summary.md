# Validation Summary: How to Use Mocked Data in OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (test framework, `.tftest.hcl` files)
- HCL configuration language
- Mock providers (`mock_provider`, `mock_resource`, `mock_data`)
- AWS provider data sources and resources (aws_ami, aws_region, aws_caller_identity, aws_ssm_parameter, aws_availability_zones, aws_vpc, aws_subnet, aws_security_group, aws_lb)
- HTTP provider (`http` data source)

## Sources Consulted
- [OpenTofu - Command: test](https://opentofu.org/docs/cli/commands/test/) — confirms `mock_provider`, `mock_resource`, `mock_data`, `defaults`, `alias`, `for_each` syntax
- [Terraform - Tests: Provider Mocking](https://developer.hashicorp.com/terraform/language/tests/mocking) — equivalent reference for provider mocking semantics
- AWS provider documentation for the data source / resource attributes referenced (aws_ami, aws_region, aws_caller_identity, aws_ssm_parameter, aws_availability_zones, aws_vpc, aws_subnet, aws_security_group, aws_lb)
- AWS Elastic Load Balancing service endpoints — confirms `Z35SXDOTRQ7X7K` is the correct ALB hosted zone ID for us-east-1

## Issues Found
No technical issues found.

The post's HCL syntax is correct:
- `mock_provider "aws"` with nested `mock_resource` / `mock_data` blocks is valid.
- The `defaults = { ... }` map syntax matches OpenTofu's documented form.
- `alias` is a supported attribute on `mock_provider`, and multiple `mock_provider` blocks with different aliases for the same provider is the documented pattern for aliased providers.
- AWS data source / resource attribute names (e.g., `account_id`, `arn`, `user_id` on aws_caller_identity; `name`, `description` on aws_region; `names`, `state` on aws_availability_zones; `value`, `version`, `type`, `arn` on aws_ssm_parameter; `id`, `dns_name`, `zone_id`, `arn` on aws_lb) are all real attributes from the AWS provider schema.
- The ALB hosted zone ID `Z35SXDOTRQ7X7K` is genuinely the correct ALB zone for us-east-1.
- The `http` provider's `http` data source returns `response_body`, `status_code`, and `response_headers` as documented.
- File naming `tests/with_mocked_data.tftest.hcl` matches OpenTofu's recognized test-file extensions.

## Review Notes
- The "Mocking Provider-Level Functions" section title is slightly misleading because the snippet actually mocks data sources (`aws_ssm_parameter`, `aws_availability_zones`) rather than provider-defined functions (which would be `provider::name::fn` calls). The content within the section is technically correct; only the heading wording could be clearer. Per review guidelines, I left the section title intact to avoid stylistic restructuring.
- The "Scenario-Based Mocking" `run` block does not include a `providers = { aws.primary = aws.us_east, aws.secondary = aws.us_west }` mapping. In practice, a test consuming aliased mock providers usually needs an explicit `providers` mapping inside `run` if the module declares matching provider aliases. This is not strictly incorrect for all module structures, so I did not modify it; readers adapting the snippet may need to add such a block.
- `mock_resource` `defaults` only override computed attributes; the snippet correctly populates only computed values (IDs, ARNs, etc.).
