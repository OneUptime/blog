# Validation Summary: How to Enable and Analyze VPC Flow Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC Flow Logs
- AWS CLI
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- Amazon S3
- Amazon Athena
- SQL

## Sources Consulted
- AWS CLI `create-flow-logs` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon VPC Flow Log records documentation: https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- IAM role for publishing flow logs to CloudWatch Logs: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-iam-role.html
- Amazon Athena VPC Flow Logs partition projection guide: https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs-partition-projection.html
- Amazon VPC Flow Logs overview and pricing notes: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html
- Amazon VPC Flow Logs troubleshooting guide: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-troubleshooting.html
- CloudWatch Logs Insights discovered fields for VPC Flow Logs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html

## Issues Found
- The sample default flow log record listed port `443` before `49152`, then described that position as destination port. AWS default VPC Flow Logs use `srcport` before `dstport`, so I changed the sample to `49152 443` and corrected the breakdown to source port, then destination port.
- The Athena table used `PARTITIONED BY (dt string)` and queried `dt`, but the default S3 path for VPC Flow Logs is non-Hive style and would not automatically populate that partition. I changed the example to use Athena partition projection with a `day` partition and a `storage.location.template`, matching AWS's documented approach for VPC Flow Logs.
- The monitoring section referred to CloudWatch metrics named `DeliverLogsSuccess` and `DeliverLogsError`, but the AWS VPC Flow Logs troubleshooting documentation points users to the flow log Status column or `describe-flow-logs` fields such as `DeliverLogsErrorMessage`. I replaced the metric claim with that documented troubleshooting method.

## Review Notes
- The AWS CLI commands and IAM policy/trust policy are consistent with current AWS documentation.
- The CloudWatch Logs Insights examples use documented discovered VPC Flow Logs field names such as `srcAddr`, `dstAddr`, `srcPort`, `dstPort`, `action`, and `bytes`.
- The S3 example assumes the target bucket and required bucket permissions are already in place; AWS documents separate troubleshooting steps for missing buckets or insufficient S3 bucket policies.
