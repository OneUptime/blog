# Validation Summary: How to Write Unit Tests for OpenTofu Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (test framework, `.tftest.hcl` files)
- HCL (HashiCorp Configuration Language)
- `mock_provider`, `mock_resource`, `mock_data` blocks
- `expect_failures` for variable validation testing
- terraform-provider-aws (aws_instance, aws_vpc, aws_subnet, aws_cloudwatch_log_group)
- GitHub Actions (`opentofu/setup-opentofu@v1`)

## Sources Consulted
- OpenTofu `tofu test` command reference: https://opentofu.org/docs/cli/commands/test/
- OpenTofu 1.8.0 release notes (provider mocking introduction): https://opentofu.org/blog/opentofu-1-8-0/
- OpenTofu 1.8 "What's New" page: https://opentofu.org/docs/v1.8/intro/whats-new/
- terraform-provider-aws `aws_instance` resource reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- `opentofu/setup-opentofu` GitHub Action

## Issues Found
1. **Incorrect OpenTofu version for mock_provider support.** The CI workflow originally specified `tofu_version: "1.7.0"`, but provider mocking (`mock_provider`, `mock_resource`, `mock_data`) was introduced in OpenTofu **1.8.0**, not 1.7.0. Changed the version to `1.8.0` so that the example actually works as described.
2. **Incorrect `tofu test` CLI syntax.** The post used `tofu test tests/unit.tftest.hcl -verbose`, passing the test file as a positional argument. `tofu test` does not accept positional file arguments — a specific file must be selected with the `-filter=testfile` flag. Changed the command to `tofu test -filter=tests/unit.tftest.hcl -verbose`.

## Review Notes
- All HCL test-file syntax (`mock_provider`, `mock_resource` with `defaults`, `mock_data`, top-level `variables` block, `run` blocks with `command = plan`, `assert` blocks with `condition`/`error_message`, `expect_failures = [var.name]`) is correct for OpenTofu 1.8.0+.
- The `aws_instance.instance_state` attribute used in mock defaults is a valid computed attribute of the AWS provider's `aws_instance` resource.
- Referencing module outputs inside assertions via `output.vpc_id` / `output.private_subnet_ids` is valid in test files.
- The `length([for r in aws_cloudwatch_log_group.app : r])` pattern for checking conditional resource creation works, though `length(aws_cloudwatch_log_group.app)` alone is sufficient when the resource uses `count`.
- The comparison table correctly summarizes the semantic difference between unit tests (`plan` + mocks) and integration tests (`apply` + real provider).
