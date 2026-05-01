# Validation Summary: How to Configure DynamoDB On-Demand Capacity with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS DynamoDB
- AWS CLI
- HashiCorp AWS provider

## Sources Consulted
- Amazon DynamoDB on-demand capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- Considerations when switching capacity modes in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-switching-capacity-modes.html
- Understanding DynamoDB warm throughput: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/warm-throughput.html
- DynamoDB provisioned capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html
- Amazon DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- AWS CLI `describe-table` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.9/cli/commands/apply/
- AWS provider `aws_dynamodb_table` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown

## Issues Found
- The introduction said on-demand scales to "any traffic level" without qualification. I changed this to "automatically scales without capacity planning" because AWS documents default throughput quotas and specific scaling behavior for new tables and rapid traffic growth.
- The quoted on-demand pricing in the introduction was outdated. I updated it to the current DynamoDB Standard pricing for `us-east-1` used in AWS pricing examples: `$0.625` per million writes and `$0.125` per million reads.
- The `global_secondary_index` example used deprecated `hash_key` and `range_key` arguments. I replaced them with `key_schema` blocks to match the current AWS provider documentation.
- The conclusion overstated cost savings, described the on-demand to provisioned switch incorrectly, and said pre-warming was not possible. I replaced that text with current AWS guidance: provisioned mode can be more cost-effective for predictable traffic, initial provisioned capacity should be chosen from CloudWatch consumption and set high enough for the transition, and DynamoDB now supports pre-warming through warm throughput.

## Review Notes
- Pricing varies by Region and table class; the values in the post are now explicitly scoped to DynamoDB Standard tables in `us-east-1` as of `2026-05-01`.
- Command syntax was verified against the official OpenTofu and AWS CLI documentation. Local `tofu` and `aws` binaries were not installed in the review environment.
