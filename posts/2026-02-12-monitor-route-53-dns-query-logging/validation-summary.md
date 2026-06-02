# Validation Summary: How to Monitor Route 53 DNS Query Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 public DNS query logging
- Amazon Route 53 Resolver query logging
- Amazon CloudWatch Logs and Logs Insights
- AWS CLI
- Amazon S3 lifecycle configuration
- Python with boto3

## Sources Consulted
- AWS Route 53 Developer Guide: Public DNS query logging - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/query-logs.html
- AWS CLI Command Reference: route53 create-query-logging-config - https://docs.aws.amazon.com/cli/latest/reference/route53/create-query-logging-config.html
- AWS Route 53 Developer Guide: Resolver query logging - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html
- AWS Route 53 Developer Guide: AWS resources that you can send VPC Resolver query logs to - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs-choosing-target-resource.html
- AWS Route 53 Developer Guide: Values that appear in VPC Resolver query logs - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs-format.html
- AWS Route 53 Developer Guide: Route 53 VPC Resolver query log example - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs-example-json.html
- AWS CLI Command Reference: route53resolver create-resolver-query-log-config - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-query-log-config.html
- AWS CLI Command Reference: route53resolver associate-resolver-query-log-config - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/associate-resolver-query-log-config.html
- Amazon CloudWatch Logs User Guide: Logs Insights operations and functions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- Amazon CloudWatch Logs User Guide: Metric filter pattern syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntaxForMetricFilters.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The public DNS query log example omitted the Route 53 edge location field. Added an example edge location value and added the field to the list, matching the AWS documented public query log field order.
- The Resolver CloudWatch destination example did not create the CloudWatch log group first and did not make the same-Region requirement explicit. Added log group creation and retention commands in `us-east-1`, and added `--region us-east-1` to the Resolver setup commands.
- The Resolver CloudWatch Logs destination ARN was missing the log group ARN suffix shown in the AWS CLI examples for `create-resolver-query-log-config`. Updated it to use `arn:aws:logs:...:log-group:/aws/route53resolver/vpc-dns:*`.
- The sample VPC IDs used human-readable placeholders such as `vpc-production`, which are not realistic VPC ID values. Replaced them with valid-shaped VPC IDs.
- The Logs Insights examples use Resolver JSON fields, not public hosted-zone log fields. Clarified that those queries are for Resolver query logs in CloudWatch.
- The second metric filter command omitted the explicit region used by the surrounding CloudWatch Logs examples. Added `--region us-east-1`.

## Review Notes
The Python example starts Logs Insights queries and intentionally does not poll for results; the post already notes that production code should poll. Public hosted-zone query logging only logs queries received by Route 53, so cached recursive-resolver responses are not represented in those logs.
