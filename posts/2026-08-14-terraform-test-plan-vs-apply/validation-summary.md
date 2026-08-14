# Validation Summary: Choose plan or apply in terraform test

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- Terraform test framework and HCL test files
- Terraform `plan` and `apply` operations
- Terraform provider mocking and resource overrides
- Terraform test state management and `state_key`
- Terraform validation, custom conditions, and `expect_failures`
- HashiCorp AWS provider resources

## Sources Consulted

- [Terraform tests language reference](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform test command reference](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform plan command reference](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform provider mocking reference](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform 1.11.0 changelog](https://github.com/hashicorp/terraform/blob/v1.11.0/CHANGELOG.md)
- [Terraform 1.15.8 root-level override parsing](https://github.com/hashicorp/terraform/blob/v1.15.8/internal/configs/test_file.go#L540-L567)
- [Terraform 1.15.8 mock-provider override parsing](https://github.com/hashicorp/terraform/blob/v1.15.8/internal/configs/mock_provider.go#L261-L278)
- [Terraform `one` function reference](https://developer.hashicorp.com/terraform/language/functions/one)
- [Write Terraform Tests tutorial](https://developer.hashicorp.com/terraform/tutorials/configuration-language/test)
- [Terraform testing features overview](https://developer.hashicorp.com/terraform/cli/test)
- [AWS provider: S3 bucket server-side encryption configuration](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration)
- [AWS provider: IAM policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy)

## Issues Found

- The encryption assertion indexed `rule[0]`, but the AWS provider represents `rule` as a set, which cannot be indexed. Changed it to use `one(...rule)` before accessing the nested single-item list.
- The plan-time override example implied that `override_during = plan` was available with Terraform 1.7 and placed the setting only on a separate `mock_provider` block. Plan-time mock and override values were introduced in Terraform 1.11, and a root-level `override_resource` does not reliably inherit timing from a sibling mock-provider block. Updated the version guidance and placed `override_during = plan` directly on the relevant override.
- The opening guidance implied that any assertion using provider-returned state or an earlier-created resource requires its own apply. A later plan can use state or outputs from an earlier apply. Updated the guidance to reserve apply for runs that create or update resources or need values that remain unknown until that run applies.
- The external behavior guidance implied that the probe run must apply. HashiCorp's documented pattern creates the endpoint in an earlier apply and probes it through a data source in a later plan. Updated the apply-use list, comparison table, and conclusion accordingly.
- The isolation guidance implied that a separate test file is required. Terraform 1.11 and later can isolate runs in one file with distinct `state_key` values. Updated the guidance to include both valid approaches.
- The comparison table said an explicit override was sufficient for a provider-generated ID in a plan. Overrides default to apply-time values, so the table now requires `override_during = plan` for that case.
- The idempotency bullet could imply that repeated apply runs automatically prove a stable plan. Terraform's HCL test runner does not automatically fail solely because a subsequent plan is non-empty. Reworded it to require explicitly asserted state stability across repeated applies.
- The cost, quota, eventual-consistency, and cleanup warning was stated for all applies even though mocked applies do not incur real-cloud risks. Scoped it to real-provider applies.
- The API-free advice was too broad because a targeted override suppresses underlying operations only for its target. Clarified that a mock provider is the appropriate whole-test control and described the narrower scope of targeted overrides.
- Qualified the tagging recommendation with "where supported" because not every provider resource supports tags, and expanded the janitor guidance to include otherwise identifiable leftovers.

## Review Notes

- The corrected examples were exercised with Terraform 1.15.8 and HashiCorp AWS provider 6.60.0 using a mocked provider; all nine test runs passed.
- The snippets are excerpts and assume the referenced module variables, resources, and outputs exist.
- The non-null bucket ARN assertion is valid but checks only presence, not ARN format.
- All links in the post resolved to the intended official documentation or author page during review.
