# Validation Summary: How to Configure DynamoDB Auto Scaling with OpenTofu - Autoscaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS DynamoDB
- AWS Application Auto Scaling
- AWS CLI
- HCL

## Sources Consulted
- OpenTofu `tofu init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu `tofu plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu resource lifecycle and `ignore_changes` documentation: https://opentofu.org/docs/v1.11/language/resources/behavior/
- HashiCorp AWS provider `aws_dynamodb_table` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- HashiCorp AWS provider `aws_appautoscaling_target` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_target.html.markdown
- HashiCorp AWS provider `aws_appautoscaling_policy` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_policy.html.markdown
- AWS DynamoDB auto scaling guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.html
- AWS DynamoDB and Application Auto Scaling integration guide: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-dynamodb.html
- AWS guide for managing DynamoDB auto scaling with the AWS CLI: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.CLI.html
- AWS guide for global secondary indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- AWS CLI `describe-scaling-activities` command reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/describe-scaling-activities.html

## Issues Found
- The table example omitted lifecycle handling for autoscaled provisioned capacity. I added `lifecycle.ignore_changes` so later `tofu plan` or `tofu apply` runs do not try to reset table and index capacity after Application Auto Scaling changes them.
- The `global_secondary_index` block used deprecated `hash_key` syntax in the AWS provider. I replaced it with `key_schema`, which is the current syntax documented by the provider.
- The GSI example only configured read autoscaling even though the post says GSI capacity must be scaled separately and the example GSI is provisioned for both read and write throughput. I added GSI write scalable target and policy resources.
- The Step 5 note said the AWS CLI command showed current capacity, but `describe-scaling-activities` shows recent scaling actions. I corrected the description to match the command.

## Review Notes
- The example is now technically correct, but the provider documentation notes that autoscaled GSIs can create drift and points to more granular GSI management options for advanced setups.
- The sample GSI is valid, but because it uses the same `id` partition key as the base table it does not demonstrate a distinct access pattern. A future revision could use a different indexed attribute for a more realistic example.
- `tofu` and `aws` were not installed in the local workspace, so CLI validation was performed against official documentation rather than local `--help` output.
