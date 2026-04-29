# Validation Summary: How to Mock Resources in OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (testing framework with `tofu test`)
- HCL (HashiCorp Configuration Language)
- AWS provider resources: `aws_instance`, `aws_s3_bucket`, `aws_db_instance`, `aws_iam_role`, `aws_vpc`, `aws_subnet`
- Infrastructure as Code (IaC) testing concepts

## Sources Consulted
- OpenTofu official documentation on the `tofu test` command and mocking: https://opentofu.org/docs/cli/commands/test/
- Terraform AWS Provider documentation for `aws_db_instance`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- OpenTofu mock provider, mock_resource, and mock_data block reference

## Issues Found
No technical issues found.

The post accurately describes:
- The `mock_provider` block syntax in OpenTofu test files.
- The nested `mock_resource` block with the `defaults` map field, which is the correct attribute name per OpenTofu docs.
- The behavior that, without explicit defaults, OpenTofu auto-generates values for resource attributes.
- The use of `command = plan` and `assert` blocks within `run` blocks.
- The use of `output.<name>` references to read module outputs in test assertions.

The AWS resource attribute names referenced in the mocks (`id`, `arn`, `public_ip`, `private_ip`, `public_dns`, `private_dns`, `instance_state`, `availability_zone`, `subnet_id`, `vpc_security_group_ids`, `bucket`, `bucket_domain_name`, `bucket_regional_domain_name`, `region`, `address`, `endpoint`, `port`, `status`, `multi_az`, `engine`, `engine_version`, `name`, `unique_id`, `cidr_block`, `vpc_id`) are all valid attributes on their respective AWS provider resources.

DNS hostname formats are correct for `us-east-1` (`compute-1.amazonaws.com` for public DNS and `ec2.internal` for private DNS), and the ARN formats follow the standard AWS ARN structure.

## Review Notes
- The mock values used (e.g., `engine_version = "14.8"`) are illustrative mock values; their currency in the real world is irrelevant since they only need to satisfy assertions in tests.
- For `aws_db_instance`, the AWS provider also exposes `engine_version_actual` as the running version, distinct from the user-configured `engine_version`. The post mocks `engine_version`, which is acceptable for tests; if a module reads `engine_version_actual`, that would need its own mock entry.
- The post does not explicitly mention that these blocks belong inside `.tftest.hcl` files, but the `run` block context makes this clear from the OpenTofu testing model.
- The post does not cover the `override_resource` / `override_data` blocks, which are an alternative mechanism for fine-grained per-test overrides. This is fine — the post is scoped to `mock_resource` defaults.
