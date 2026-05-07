# Validation Summary: How to Analyze IPv6 Traffic in AWS VPC Flow Logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon VPC Flow Logs
- AWS CLI
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch Logs and CloudWatch Logs Insights
- Amazon Athena
- Terraform
- IPv6 networking in AWS VPCs

## Sources Consulted
- Amazon VPC Flow Logs overview: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html
- Flow log records and available fields: https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- Create a flow log that publishes to CloudWatch Logs: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl-create-flow-log.html
- IAM role for publishing flow logs to CloudWatch Logs: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-iam-role.html
- AWS CLI `create-flow-logs`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- AWS CLI `create-role`: https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html
- AWS CLI `put-role-policy`: https://docs.aws.amazon.com/cli/latest/reference/iam/put-role-policy.html
- CloudWatch Logs Insights discovered fields for Amazon VPC flow logs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Amazon Athena table creation for VPC flow logs: https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs-create-table-statement.html
- Terraform Registry `aws_flow_log`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log

## Issues Found
- The AWS CLI example created the IAM trust policy but did not attach the permissions policy required for delivery to CloudWatch Logs. I added `aws iam put-role-policy` with the documented minimum CloudWatch Logs permissions.
- The AWS CLI custom log format used invalid field identifiers: `windowstart`, `windowend`, and `flowlogstatus`. I replaced them with the documented field names `start`, `end`, and `log-status`.
- The Terraform IAM policy omitted `logs:DescribeLogGroups` and `logs:DescribeLogStreams`, which AWS documents as part of the minimum permissions for publishing flow logs to CloudWatch Logs. I added both actions.
- The CloudWatch Logs Insights queries used incorrect field names for discovered VPC Flow Log fields. I updated them from lowercase names like `srcaddr` and `dstport` to the documented camelCase names such as `srcAddr` and `dstPort`.
- The Athena DDL and queries used nonstandard column names, a malformed 9-digit AWS account ID placeholder, and omitted the documented partitioning/header settings for standard S3 VPC Flow Logs. I replaced the table definition with AWS-documented field names and types and added the partition step required before querying.

## Review Notes
- If S3 flow logs use a custom log format instead of the default format, the Athena table columns must match the configured field order exactly.
- CloudWatch Logs Insights auto-discovers standard VPC Flow Log fields with camelCase names. If you change the log format substantially, you may need to use `parse` in Logs Insights queries.
