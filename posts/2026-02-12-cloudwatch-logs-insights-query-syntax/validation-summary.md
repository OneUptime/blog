# Validation Summary: How to Use CloudWatch Logs Insights Query Syntax

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Amazon CloudWatch Logs Insights
- Logs Insights QL
- CloudWatch Logs query commands and functions
- AWS CloudWatch Logs query limits

## Sources Consulted
- AWS CloudWatch Logs Insights language query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- AWS CloudWatch Logs Insights supported logs and discovered fields: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- AWS CloudWatch Logs Insights `parse` command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Parse.html
- AWS CloudWatch Logs Insights `stats` command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- AWS CloudWatch Logs Insights `limit` command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Limit.html
- AWS CloudWatch Logs Insights functions and operations: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- AWS CloudWatch Logs `StartQuery` API reference: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_StartQuery.html

## Issues Found
- The post described itself as a complete reference covering every command, but AWS documents additional Logs Insights QL commands such as `anomaly`, `filterIndex`, `pattern`, `diff`, `SOURCE`, `dedup`, `unmask`, `unnest`, `lookup`, `join`, and subqueries. Changed the wording to describe the post as a practical reference for common commands.
- The `@log` field was described as the log group and stream combined. AWS documents it as a log group identifier in the form `account-id:log-group-name`, so the description was corrected.
- The JSON field discovery wording omitted the Standard log class caveat. Added that qualification.
- A `stats` example filtered on `level` after aggregation, where the original field would no longer be available. Moved the `filter` before `stats`.
- The `limit` command default and maximum were outdated. Updated the default to 10,000 and the query command maximum to 100,000.
- The date/time function example used `fromMillis(@timestamp)`, but `fromMillis` expects a numeric epoch-milliseconds field, while `@timestamp` is already a timestamp. Replaced it with `toMillis(@timestamp)`.
- The IP function example used incorrect casing, `isValidIpv4`. AWS documents the function as `isValidIpV4`, so the example was corrected.
- The error-rate example used `sum(level = "ERROR")`, but `sum` is documented for numeric fields. Replaced it with `sum(case(level = "ERROR", 1, 0))`.
- The limits section said queries scan up to 10,000 log groups and results are capped at 10,000 rows. Updated it to the documented `StartQuery` parameter limit of up to 50 log groups, the 60-minute runtime timeout, and the current `limit` command behavior.

## Review Notes
- The `StartQuery` API `limit` parameter is documented with a maximum of 10,000, while the Logs Insights QL `limit` command documentation says the query command can specify up to 100,000. The post now specifically describes the query command maximum in the `limit` section and the `StartQuery` log group selection limit in the performance section.
