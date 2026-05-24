# Validation Summary: How to Create VPC Flow Logs to CloudWatch with Terraform

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp AWS Provider (~> 5.0)
- AWS VPC Flow Logs
- AWS CloudWatch Logs
- AWS CloudWatch Metric Filters
- AWS CloudWatch Alarms
- AWS CloudWatch Logs Insights
- AWS IAM (roles, policies, trust relationships)
- AWS SNS

## Sources Consulted
- Terraform AWS Provider — `aws_flow_log` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform AWS Provider — `aws_cloudwatch_log_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS Provider — `aws_cloudwatch_log_metric_filter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS Provider — `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS VPC Flow Logs documentation — flow log records and custom format fields: https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- AWS VPC Flow Logs — Publishing to CloudWatch Logs (IAM role/trust): https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl.html
- AWS CloudWatch Logs metric filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- AWS CloudWatch Logs Insights — discovered fields for VPC Flow Logs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData_DiscoverableFields.html

## Issues Found
No technical issues found.

Verified specifically:
- `aws_flow_log` arguments used (`vpc_id`, `subnet_id`, `eni_id`, `traffic_type`, `iam_role_arn`, `log_destination`, `log_format`, `max_aggregation_interval`, `tags`) are all valid and current in the AWS provider v5.
- IAM trust principal `vpc-flow-logs.amazonaws.com` is the correct service principal for VPC Flow Logs.
- The IAM permissions granted (`logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogGroups`, `logs:DescribeLogStreams`) match AWS's documented requirements for publishing VPC flow logs to CloudWatch Logs.
- All custom log format fields used (e.g. `version`, `account-id`, `interface-id`, `srcaddr`, `dstaddr`, `pkt-srcaddr`, `pkt-dstaddr`, `flow-direction`, `traffic-path`, `pkt-src-aws-service`, `pkt-dst-aws-service`, `sublocation-type`, `sublocation-id`, `region`, `az-id`) are valid VPC Flow Logs v3+ fields.
- The double-dollar `$${...}` escaping in `log_format` is correct for Terraform string interpolation, ensuring the literal `${...}` is sent to AWS.
- `max_aggregation_interval = 60` (1 minute) is one of the two valid values (60 or 600).
- `traffic_type` values used (`ALL`, `REJECT`) are valid; the only other valid value is `ACCEPT`.
- Metric filter bracket patterns contain 14 positional fields matching the default VPC Flow Logs v2 format.
- TCP protocol number `6` and SSH port `22` used in the SSH metric filter are correct.
- CloudWatch Logs Insights queries use the camelCase auto-discovered field names (`srcAddr`, `dstPort`, etc.) that CloudWatch Logs Insights actually exposes for parsed VPC flow log records.
- `aws_cloudwatch_metric_alarm` arguments and `aws_sns_topic` usage are syntactically and semantically correct.

## Review Notes
- The post uses the v2 (default) flow log format for the metric filter patterns, while the custom-format example uses v3+ fields. Both are valid; readers should be aware that if they enable the custom log format on the same log group, the existing bracket-pattern metric filters would need to be updated to match the new field order.
- The example uses `Resource = "*"` in the IAM policy for simplicity; in production, scoping this to the specific log group ARN (and its `:log-stream:*`) would be a tighter least-privilege configuration, but this is a hardening suggestion rather than a correctness issue.
- The `aws_subnet.private` and `aws_instance.web` references in the Subnet/ENI section are illustrative placeholders that assume those resources are defined elsewhere; this matches typical tutorial style.
- `aws_iam_role_policy.role = aws_iam_role.flow_logs.id` works because the `id` attribute of `aws_iam_role` is the role name, which is what `aws_iam_role_policy` expects.
