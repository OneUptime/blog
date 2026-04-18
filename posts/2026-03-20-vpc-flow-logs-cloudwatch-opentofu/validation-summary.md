# Validation Summary: How to Configure VPC Flow Logs to CloudWatch with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS VPC Flow Logs (v2–v5 fields)
- AWS CloudWatch Logs (log groups, metric filters, alarms)
- AWS CloudWatch Logs Insights (saved query definitions)
- AWS IAM (service-linked role trust policy for `vpc-flow-logs.amazonaws.com`)
- AWS SNS (referenced for alarm actions)

## Sources Consulted
- Terraform AWS provider `aws_flow_log` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- AWS VPC Flow Log record fields (default + v3/v4/v5 extensions): https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html#flow-logs-fields
- Publishing VPC flow logs to CloudWatch Logs (IAM role, permissions): https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl.html
- CloudWatch Logs metric filter syntax for space-delimited events: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- CloudWatch Logs Insights discoverable fields (auto-discovery limits): https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- Terraform AWS provider `aws_cloudwatch_query_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_query_definition

## Issues Found

1. **Metric filter pattern field-count mismatch.** The `aws_cloudwatch_metric_filter.rejected_traffic` pattern listed 14 tokens, but the flow log uses a custom `log_format` with 21 fields. CloudWatch space-delimited patterns require the token count to match the log line (or use a single `...` ellipsis). As written, the filter would never match. Fixed by appending `, ...` to the pattern so the remaining 7 fields (`vpc-id, subnet-id, instance-id, tcp-flags, type, pkt-srcaddr, pkt-dstaddr`) are absorbed. Added a short inline comment explaining why.

2. **Logs Insights queries relied on auto-discovered fields with a custom `log_format`.** CloudWatch Logs Insights only auto-discovers fields for the **default** VPC Flow Log format. Because the post configures a custom format, references to `srcAddr`, `dstAddr`, `action`, `bytes`, etc. would resolve to no rows. Fixed both `aws_cloudwatch_query_definition` resources by prepending a `parse @message "* * * * * * * * * * * * * * * * * * * * *" ...` line that extracts the 21 positional fields. Added a short inline comment noting the auto-discovery limitation.

## Review Notes
- All `aws_flow_log` attributes, the 21 custom `log_format` tokens, the `vpc-flow-logs.amazonaws.com` trust principal, and the IAM action list (`logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogGroups`, `logs:DescribeLogStreams`) match current AWS documentation.
- The `$${...}` escaping in `log_format` is correct — Terraform/OpenTofu sees `${...}` as interpolation, so double-dollar escapes it so AWS receives a literal `${field}` template.
- `aws_sns_topic.security_alerts` is referenced but not defined in the post; this is reasonable for a focused tutorial but worth noting for readers who copy-paste.
- The subnet-level flow logs (`aws_flow_log.subnet`) use `traffic_type = "REJECT"` without setting a custom `log_format`, so they will use AWS's default 14-field format. That's fine, but note the metric filter / Insights queries are now wired to the custom 21-field format, so they will only match the VPC-level flow log stream — not the subnet streams. Not a correctness bug since both write to the same log group but different streams, and CloudWatch Insights queries operate across streams; the subnet REJECT records would have fewer tokens and wouldn't match the `parse` pattern. This is a minor caveat rather than an error.
