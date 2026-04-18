# Validation Summary: How to Use VPC Flow Logs to Monitor IPv4 Traffic on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC Flow Logs (v2 default format)
- AWS CLI (`aws ec2 create-flow-logs`)
- Amazon CloudWatch Logs Insights
- Amazon S3 (flow log destination)
- Amazon Athena (SQL querying of S3-stored flow logs)
- IPv4 networking fundamentals (addresses, ports, protocols)

## Sources Consulted
- AWS VPC User Guide — Flow Logs: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html
- AWS VPC Flow Log records (default v2 format): https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-records-examples.html
- AWS CLI reference for `aws ec2 create-flow-logs`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- CloudWatch Logs Insights supported operations and functions (including `ispresent`, `like`, `strcontains`): https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- AWS Athena documentation — Querying VPC flow logs: https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs.html

## Issues Found
- **Invalid CloudWatch Logs Insights function (`startsWith`)** — The rejected-traffic query used `filter not startsWith(srcAddr, "fe80:")`. `startsWith` is not a supported CloudWatch Logs Insights function (the supported string helpers are `strcontains`, `isempty`, `isblank`, `concat`, `substr`, `replace`, `trim`, etc., plus the `like` operator for pattern matching). Replaced with `filter srcAddr not like /:/`, which uses the supported `like` regex operator to exclude any IPv6 addresses (they contain colons, while IPv4 addresses do not). This preserves the author's intent of focusing the query on IPv4 traffic.

## Review Notes
- The default v2 VPC Flow Log field order (`version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status`) and the example record are correct.
- CloudWatch Logs Insights auto-discovered camelCase field names (`srcAddr`, `dstAddr`, `srcPort`, `dstPort`, `action`, `bytes`) are accurate for VPC flow logs.
- `--deliver-logs-permission-arn` is required only for the CloudWatch Logs destination, not for S3 — the post handles this correctly by omitting it in the S3 example.
- The Athena table schema uses 14 columns matching the default v2 format. AWS's own sample schema sometimes uses `BIGINT` for `starttime`/`endtime`/`numpackets` for safety with large values, but `INT` is sufficient for Unix-epoch seconds (until 2038) and moderate packet counts; not strictly incorrect, just a conservative improvement to consider.
- The IPv4-focused filtering in the CloudWatch Insights queries is slightly redundant in practice if the VPC only has IPv4 traffic, but is correct defensive filtering for dual-stack VPCs.
