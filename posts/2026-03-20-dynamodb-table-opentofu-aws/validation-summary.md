# Validation Summary: How to Create a DynamoDB Table with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon DynamoDB
- AWS Application Auto Scaling

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu settings (`terraform` block): https://opentofu.org/docs/language/settings/
- OpenTofu CLI overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_dynamodb_table` docs for the v5.x line: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.100.0/website/docs/r/dynamodb_table.html.markdown
- AWS provider `aws_appautoscaling_target` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_target.html.markdown
- AWS provider `aws_appautoscaling_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_policy.html.markdown
- DynamoDB TTL: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- DynamoDB throughput capacity modes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
- DynamoDB Streams `StreamSpecification`: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_StreamSpecification.html
- DynamoDB point-in-time recovery: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- Enable point-in-time recovery in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery_Howitworks.html
- Application Auto Scaling target tracking: https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-target-tracking.html
- DynamoDB with Application Auto Scaling: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-dynamodb.html

## Issues Found
- The TTL comment implied immediate deletion. I changed it to say expired items are typically deleted within a few days, which matches the DynamoDB TTL documentation.
- The provisioned-capacity autoscaling example did not account for Application Auto Scaling changing `read_capacity`. I added `lifecycle { ignore_changes = [read_capacity] }` so subsequent applies do not fight autoscaling-managed capacity, as recommended by the AWS provider docs.
- I verified that `global_secondary_index.hash_key` is still the correct syntax for the AWS provider version pinned by the post (`~> 5.0`). I did not replace it with the newer `key_schema` syntax because that is not documented for the v5.x provider line reviewed here.

## Review Notes
- The `tofu init`, `tofu plan`, and `tofu apply` commands used in the post are current OpenTofu CLI commands.
- Local `tofu validate` execution was not possible in this workspace because the `tofu` binary was not installed.
