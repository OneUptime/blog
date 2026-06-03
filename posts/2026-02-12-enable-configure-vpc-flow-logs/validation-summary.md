# Validation Summary: How to Enable and Configure VPC Flow Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC
- VPC Flow Logs
- Amazon CloudWatch Logs
- Amazon S3
- Amazon Data Firehose
- AWS IAM
- AWS CLI
- CloudWatch metric filters and alarms

## Sources Consulted
- Amazon VPC User Guide: Flow logs basics - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-basics.html
- Amazon VPC User Guide: IAM role for publishing flow logs to CloudWatch Logs - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-iam-role.html
- Amazon VPC User Guide: Create a flow log that publishes to CloudWatch Logs - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl-create-flow-log.html
- Amazon VPC User Guide: Flow log records - https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- Amazon VPC User Guide: Flow log files - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3-path.html
- AWS CLI Command Reference: ec2 create-flow-logs - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon CloudWatch Logs User Guide: Enable logging from AWS services - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-logs-and-resource-policy.html
- Amazon CloudWatch Logs User Guide: Filter pattern syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Amazon CloudWatch Pricing - https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- Updated the Firehose destination name from "Kinesis Data Firehose" to "Amazon Data Firehose" to match current AWS service naming.
- Clarified that `traffic-path` describes the path taken by egress traffic, matching the VPC Flow Logs field definition.
- Corrected the S3 log file timing description. AWS documents that VPC Flow Logs publishes S3 log files at 5-minute intervals, and each file can contain some or all records for the previous 5 minutes.
- Replaced the S3 cost estimate. Direct S3 delivery still incurs CloudWatch vended log delivery charges, so 50 GB/month is closer to $12.50/month for delivery to S3 in N. Virginia before other storage, query, request, conversion, or processing charges.
- Reworded "real-time monitoring and alerting" / "real-time alerting" to "faster monitoring and alerting" / "faster alerting" because AWS documents that VPC Flow Logs can take several minutes to begin collecting and publishing and are not real-time log streams.

## Review Notes
The AWS CLI examples, IAM trust policy, CloudWatch permissions policy, traffic type values, log format field syntax, default record breakdown, S3 destination ARN usage, aggregation interval values, and CloudWatch metric filter pattern are consistent with current AWS documentation. Pricing varies by Region and destination, so future updates should avoid hard-coded estimates unless they are explicitly scoped to a Region and date.
