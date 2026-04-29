# Validation Summary: How to Mock Data Sources in OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTofu (test framework, `.tftest.hcl`)
- HCL (HashiCorp Configuration Language)
- AWS Provider data sources (`aws_ami`, `aws_vpc`, `aws_subnets`, `aws_subnet`, `aws_iam_policy_document`, `aws_acm_certificate`, `aws_caller_identity`)
- `mock_provider`, `mock_data`, `mock_resource` blocks

## Sources Consulted
- OpenTofu testing/mocking docs: https://opentofu.org/docs/language/tests/mocking/
- OpenTofu test command docs: https://opentofu.org/docs/cli/commands/test/
- OpenTofu 1.8.0 release notes (Provider Mocking): https://opentofu.org/blog/opentofu-1-8-0/
- AWS provider data source docs:
  - `aws_ami` (Terraform Registry)
  - `aws_vpc` (Terraform Registry)
  - `aws_subnets` / `aws_subnet` (Terraform Registry)
  - `aws_iam_policy_document` (Terraform Registry)
  - `aws_acm_certificate` (Terraform Registry)
  - `aws_caller_identity` (Terraform Registry)

## Issues Found
- **`aws_acm_certificate.domain_name` is not an exported attribute.** The mock under "ACM Certificate" included `domain_name = "example.com"` in `defaults`, but the AWS provider's `aws_acm_certificate` data source exports `arn`, `id`, `status`, `certificate`, `certificate_chain`, and `tags` (with `domain` as an input argument, not an exported attribute). Removed the `domain_name` line from the mock defaults so the example references only valid exported attributes.

## Review Notes
- All other code samples are syntactically correct: `mock_provider`, nested `mock_data`/`mock_resource` blocks with `defaults = { ... }`, `run` blocks with `command = plan`, and `assert` blocks all match the official OpenTofu test framework syntax (introduced in OpenTofu 1.8.0).
- Verified data source attributes for `aws_ami`, `aws_vpc`, `aws_subnets`, `aws_subnet`, `aws_iam_policy_document`, and `aws_caller_identity` — all listed attributes are valid.
- The `jsonencode` example for `aws_iam_policy_document.json` is a reasonable mock value pattern, since the real data source returns a JSON string in that attribute.
- The post correctly notes that `mock_data` requires the parent `mock_provider` block (it never claims top-level `mock_data` is allowed).
