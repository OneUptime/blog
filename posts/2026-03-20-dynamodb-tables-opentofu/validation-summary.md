# Validation Summary: How to Create DynamoDB Tables with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu
- Amazon DynamoDB
- AWS Application Auto Scaling
- AWS CLI

## Sources Consulted
- OpenTofu resource syntax: https://opentofu.org/docs/language/resources/syntax/
- AWS provider docs for `aws_dynamodb_table`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_table.html.markdown
- AWS provider docs for `aws_appautoscaling_target`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/appautoscaling_target.html.markdown
- AWS provider docs for `aws_appautoscaling_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/appautoscaling_policy.html.markdown
- DynamoDB secondary indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
- Managing global secondary indexes in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.OnlineOps.html
- DynamoDB encryption at rest: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html
- DynamoDB encryption at rest usage notes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/encryption.usagenotes.html
- DynamoDB point-in-time recovery: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- AWS CLI `describe-table`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html

## Issues Found
- The `global_secondary_index` example used deprecated `hash_key` and `range_key` arguments in the AWS provider. I replaced them with `key_schema` blocks to match the current provider documentation.
- The provisioned-capacity example omitted the `lifecycle.ignore_changes` setting recommended by the AWS provider when Application Auto Scaling manages table capacity. I added `ignore_changes = [read_capacity]` so the read autoscaling example does not create persistent drift in later `tofu plan` runs.
- The encryption comment implied a single key mode while also showing `kms_key_arn`. I updated the comment to clarify that omitting `kms_key_arn` uses the default KMS-managed DynamoDB key, while setting it uses a customer-managed key.
- The conclusion incorrectly stated that all secondary indexes require rebuilding the table to change them. I updated it to distinguish LSIs, which must be created with the table, from GSIs, which can be added or deleted later.
- The conclusion implied DynamoDB encryption must be separately enabled for production tables. I updated it to focus on choosing the appropriate KMS key option, since DynamoDB encrypts data at rest by default.

## Review Notes
- The CLI commands and Application Auto Scaling resource IDs are correct as written.
- The examples are partial snippets and assume the surrounding configuration already defines the AWS provider, provider version constraints, and input variables such as `project_name`, `environment`, and `kms_key_arn`.
- The post is technically accurate after the fixes above as of 2026-05-01, but AWS provider deprecations should be rechecked if the post is revised against a newer provider release.
