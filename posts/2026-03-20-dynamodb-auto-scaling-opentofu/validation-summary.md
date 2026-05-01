# Validation Summary: How to Configure DynamoDB Auto Scaling with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp AWS provider
- Amazon DynamoDB
- AWS Application Auto Scaling
- AWS CLI
- `jq`

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- Amazon DynamoDB Developer Guide, "Managing throughput capacity automatically with DynamoDB auto scaling": https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.html
- Application Auto Scaling User Guide, "Amazon DynamoDB and Application Auto Scaling": https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-dynamodb.html
- AWS CLI Command Reference, `application-autoscaling describe-scaling-policies`: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/describe-scaling-policies.html
- AWS CLI Command Reference, `dynamodb describe-table`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html
- HashiCorp AWS provider docs, `aws_appautoscaling_target`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/appautoscaling_target.html.markdown
- HashiCorp AWS provider docs, `aws_appautoscaling_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/appautoscaling_policy.html.markdown
- HashiCorp AWS provider docs, `aws_dynamodb_table`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_table.html.markdown
- HashiCorp AWS provider docs, `aws_dynamodb_global_secondary_index`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_global_secondary_index.html.markdown

## Issues Found
- The main table example attached autoscaling to a provisioned table without accounting for provider-managed capacity drift. I added `lifecycle { ignore_changes = [read_capacity, write_capacity] }` because the official provider docs recommend this when autoscaling policies manage DynamoDB table capacity.
- The GSI example used the deprecated `hash_key` argument inside `global_secondary_index`. I replaced it with `key_schema` to match the current provider documentation.
- The reusable module declared write autoscaling variables but only implemented read autoscaling resources. I added the write scalable target and write target-tracking policy so the module matches the post's stated read/write scope.
- The verification snippet queried `BillingModeSummary`, which confirms the capacity mode but not the provisioned throughput values relevant to autoscaling. I changed it to query `.Table.ProvisionedThroughput`.
- The description and conclusion overstated the behavior by implying manual CloudWatch alarm configuration and guaranteed throttling prevention. I clarified that Application Auto Scaling creates the alarms and adjusted the throttling language to align with AWS documentation.
- The best-practice line that said to "Set target utilization at 70%" was too absolute. I changed it to "Start with target utilization at 70%" because AWS documents target utilization as configurable rather than fixed.

## Review Notes
- Inline GSI autoscaling remains supported, but the current AWS provider docs also document the experimental `aws_dynamodb_global_secondary_index` resource for teams that need more granular lifecycle management around autoscaled GSIs.
