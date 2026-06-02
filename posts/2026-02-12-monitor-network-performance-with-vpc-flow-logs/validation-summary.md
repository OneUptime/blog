# Validation Summary: How to Monitor Network Performance with VPC Flow Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC Flow Logs
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- Amazon S3
- Amazon Athena
- AWS CLI
- IAM
- CloudWatch metric filters and alarms

## Sources Consulted
- AWS VPC User Guide: Flow logs basics - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-basics.html
- AWS VPC User Guide: Flow log records - https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- AWS VPC User Guide: Flow log limitations - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html
- AWS VPC User Guide: IAM role for publishing flow logs to CloudWatch Logs - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-iam-role.html
- AWS CLI Command Reference: ec2 create-flow-logs - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon CloudWatch Logs User Guide: CloudWatch Logs Insights query syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Amazon CloudWatch Logs User Guide: Supported logs and discovered fields - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- Amazon CloudWatch Logs User Guide: parse command - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Parse.html
- Amazon Athena User Guide: Query Amazon VPC flow logs - https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs.html
- Amazon Athena User Guide: Create a table for Amazon VPC flow logs and query it - https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs-create-table-statement.html
- AWS CLI Command Reference: logs put-metric-filter - https://docs.aws.amazon.com/cli/latest/reference/logs/put-metric-filter.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The VPC-level flow log description said it captures all traffic in the entire VPC. Updated it to say it captures traffic for monitored network interfaces in the VPC, because AWS documents Flow Logs exclusions and per-interface capture behavior.
- The IAM policy snippets were labeled as JSON but contained `//` comments, which are invalid JSON. Removed the inline comments while preserving the surrounding explanation.
- The aggregation interval explanation omitted the Nitro-based instance caveat. Added that Nitro-based interfaces use an aggregation interval of 60 seconds or less regardless of the configured maximum.
- The CloudWatch Logs Insights examples used SQL-style `--` comments. Replaced them with `#`, which is the documented Logs Insights comment syntax.
- The high-bandwidth Logs Insights query comment said "last hour" even though the query depends on the selected Logs Insights time range. Reworded the comment to match how CloudWatch Logs Insights time filtering works.
- The TCP flags Logs Insights query referenced `tcpFlags` as if it were an automatically discovered VPC Flow Logs field. Updated the query to parse the custom log format from `@message` before filtering on `tcpFlags`.
- The TCP flags query description claimed it found SYN packets without corresponding SYN-ACK records, but the query only counts SYN records. Reworded the text and query comment to describe the result accurately.
- The Athena table schema did not match the custom S3 flow log format shown earlier because it omitted `tcp_flags`, `traffic_path`, and `flow_direction`. Added those columns in the same order as the custom log format.
- The Athena partition example used a string `dt` partition without explaining partition loading. Updated it to use a date partition and added a note that partitions or partition projection are required before querying.
- The rejected SSH metric filter matched destination port 22 but did not constrain the IP protocol. Added `protocol="6"` so the metric tracks rejected SSH/TCP traffic.

## Review Notes
The commands and policies are otherwise consistent with current AWS CLI and AWS documentation. The article remains a high-level tutorial; production deployments should also account for S3 bucket policies, log volume, retention, and least-privilege IAM scoping.
