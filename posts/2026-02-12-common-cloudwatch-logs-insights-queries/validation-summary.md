# Validation Summary: How to Write Common CloudWatch Logs Insights Queries

## Status
validated

## Post Type
Reference

## Technologies Covered
- Amazon CloudWatch Logs Insights
- Logs Insights QL
- AWS CLI for CloudWatch Logs
- Unix epoch timestamps in shell commands

## Sources Consulted
- AWS CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- AWS CloudWatch Logs Insights `stats` command and aggregation functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- AWS CloudWatch Logs Insights `parse` command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Parse.html
- AWS CloudWatch Logs Insights operations and functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- AWS CLI `logs start-query` command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/start-query.html
- AWS CloudWatch Logs `StartQuery` API reference: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_StartQuery.html

## Issues Found
- Several examples used `sum()` directly on Boolean comparison expressions, such as `sum(level = "ERROR")`. AWS documents `sum()` as accepting numeric fields, while comparison operators return Boolean results. Updated those examples to use `sum(case(condition, 1, 0))`, preserving the intended counts with numeric values.
- The correlated-events example filtered `@timestamp` with human-readable timestamp strings. AWS documentation notes that Logs Insights does not support filtering logs with human-readable timestamps. Updated the example to use `toMillis(@timestamp)` with epoch millisecond bounds for the same UTC time window.

## Review Notes
- The examples assume application logs expose fields such as `level`, `duration`, `endpoint`, `statusCode`, `service`, `sourceIp`, and `userId`; users may need to parse these fields first depending on their log format.
- `count_distinct()` is approximate for very high-cardinality fields according to AWS documentation.
- The AWS CLI command syntax is valid, but the local review environment did not have the `aws` CLI installed, so command validation was performed against official AWS CLI documentation.
