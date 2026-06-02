# Validation Summary: How to Query VPC Flow Logs with CloudWatch Logs Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC Flow Logs
- Amazon CloudWatch Logs Insights
- AWS CLI
- AWS IAM
- IP protocol numbers and DNS traffic analysis

## Sources Consulted
- Amazon VPC User Guide: Flow log records: https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- Amazon CloudWatch Logs User Guide: Supported logs and discovered fields: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- Amazon CloudWatch Logs User Guide: Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Amazon CloudWatch Logs User Guide: filter command syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Filter.html
- Amazon CloudWatch Logs User Guide: operations and functions, including `ispresent` and `isIpInSubnet`: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- Amazon CloudWatch Logs User Guide: parse command syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Parse.html
- AWS CLI Command Reference: `aws ec2 create-flow-logs`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon VPC User Guide: IAM role for publishing flow logs to CloudWatch Logs: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-iam-role.html
- RFC 1035: Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035

## Issues Found
- CloudWatch Logs Insights discovered field names for VPC Flow Logs were shown and used as raw flow-log tokens such as `srcaddr`, `dstaddr`, `srcport`, and `dstport`. AWS documents the discovered fields as camelCase names such as `srcAddr`, `dstAddr`, `srcPort`, and `dstPort`, so I updated the wording and all affected queries.
- The "External traffic to unexpected ports" query used `dstport not in [...]` and wrapped a boolean expression in `ispresent(...)`. I changed it to `not (dstPort in [...])` and used the documented `isIpInSubnet` function for RFC1918 source filtering.
- The DNS explanation said "DNS runs on UDP port 53." RFC 1035 documents both TCP and UDP on port 53, so I changed the wording to "Most DNS queries use UDP port 53" while keeping the UDP-focused query.
- The Cross-AZ example referred to non-existent `srcaz` and `dstaz` flow log fields. AWS VPC Flow Logs provide `az-id` for the Availability Zone of the network interface where the flow is recorded, not source and destination AZ fields. I replaced the query with a valid example that parses an appended `az-id` field and summarizes traffic by recorded ENI AZ, and clarified that precise cross-AZ identification requires mapping source and destination subnets or ENIs to Availability Zones outside the query.
- The CloudWatch Logs delivery IAM section omitted the required trust policy. I added the documented trust policy that allows `vpc-flow-logs.amazonaws.com` to assume the role.

## Review Notes
The AWS CLI flow log creation command and CloudWatch Logs IAM permissions are current and match AWS documentation. The internal OneUptime links point to posts that exist in this repository. The Infrequent Access log class note is accurate for the query commands used here; AWS documents only `pattern`, `diff`, `unmask`, and `filterIndex` limitations for that log class.
