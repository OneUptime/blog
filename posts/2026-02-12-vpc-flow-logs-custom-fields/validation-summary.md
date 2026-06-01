# Validation Summary: How to Set Up VPC Flow Logs with Custom Fields

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon VPC Flow Logs
- AWS CLI
- Amazon CloudWatch Logs and CloudWatch Logs Insights
- Amazon S3
- Amazon Athena
- Terraform AWS provider
- IAM roles and policies

## Sources Consulted
- Amazon VPC User Guide: Flow log records: https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- Amazon VPC User Guide: Flow log record examples: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-records-examples.html
- AWS CLI Command Reference: create-flow-logs: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon Athena User Guide: Create a table for Amazon VPC flow logs and query it: https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs-create-table-statement.html
- Amazon CloudWatch Logs User Guide: Supported logs and discovered fields: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- Terraform Registry: aws_flow_log resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log

## Issues Found
- The custom-fields list was framed as exhaustive. Changed the wording to "commonly used fields" because AWS has added additional fields beyond the ones listed.
- The Terraform example referenced `data.aws_caller_identity.current.account_id` without defining the data source. Added `data "aws_caller_identity" "current" {}`.
- The S3 flow log example omitted the AWS service-name fields that the Athena table later queried. Added `pkt-src-aws-service` and `pkt-dst-aws-service` to the S3 `--log-format`.
- The TCP flags table incorrectly listed standalone ACK, PSH, and FIN-ACK values as VPC Flow Logs outputs. Updated the section to match AWS-supported values: FIN, SYN, RST, SYN-ACK, and aggregate combinations such as SYN+FIN and SYN-ACK+FIN.
- The traffic-path table used incorrect meanings for values 1, 2, 3, 6, and 8. Corrected the table and the Athena CASE expression to match the current Amazon VPC documentation.
- The CloudWatch Logs Insights examples assumed custom field names would be available directly. Added `parse @message` statements so the queries work with the custom log format used earlier in the post.

## Review Notes
The AWS CLI examples use current `create-flow-logs` options and valid custom `--log-format` syntax. The Athena table maps the custom field order correctly for the S3 example. In production, partitions still need to be added or projected for the date filters to work efficiently.
