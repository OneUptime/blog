# Validation Summary: How to Analyze VPC Flow Logs with CloudWatch Logs Insights

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS VPC Flow Logs
- Amazon CloudWatch Logs Insights QL
- Amazon CloudWatch dashboards
- CloudWatch Logs metric filters
- CloudWatch alarms
- AWS CLI

## Sources Consulted
- Amazon CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- CloudWatch Logs Insights operations and functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- CloudWatch Logs Insights stats command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- CloudWatch Logs Insights filter command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Filter.html
- CloudWatch Logs supported discovered fields for VPC Flow Logs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- CloudWatch dashboard body structure and log widget syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- AWS CLI put-metric-filter reference: https://docs.aws.amazon.com/cli/latest/reference/logs/put-metric-filter.html
- AWS CLI put-metric-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- CloudWatch Logs quotas and query behavior: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html
- CloudWatch Logs StartQuery API reference: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_StartQuery.html
- CloudWatch Logs log group selection options: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Field-Indexing-Selection.html

## Issues Found
- Replaced `isprivateaddr(...)` in Logs Insights queries. AWS documents `isIpInSubnet(...)`, `isIpv4InSubnet(...)`, and related IP functions, but not `isprivateaddr(...)`, so the examples now explicitly test the RFC1918 CIDR ranges.
- Replaced boolean sums in the accepted/rejected ratio query. `sum(...)` is documented for numeric values, so the query now uses `case(...)` to convert matching actions to `1` or `0`.
- Removed the unsupported `dateTimePart(@timestamp, "HH")` query. The post now tells readers to set the query time range to midnight-5 AM and then buckets results with `bin(1h)`.
- Fixed CloudWatch dashboard log widget queries to include `SOURCE '/vpc/flow-logs/vpc-abc123'`, which AWS requires for log widgets in dashboard JSON.
- Removed `stacked` from log widgets because AWS documents it for metric widgets, not log widgets.
- Corrected the automated alert wording. The metric filter example counts total rejected flows, not rejections grouped by a single source IP.
- Updated stale Logs Insights limits: query timeout is now 60 minutes, Logs Insights QL concurrency is 100 queries per account per Region in supported Regions, and API pagination can retrieve up to 100,000 log event results while the console displays up to 10,000.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against official AWS CLI documentation instead of local `--help` output.
