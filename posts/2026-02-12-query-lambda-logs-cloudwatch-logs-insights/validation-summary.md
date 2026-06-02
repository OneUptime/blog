# Validation Summary: How to Query Lambda Logs with CloudWatch Logs Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch Logs
- CloudWatch Logs Insights QL
- CloudWatch dashboards
- API Gateway and SQS-triggered Lambda logging patterns

## Sources Consulted
- AWS Lambda Developer Guide: Viewing CloudWatch logs for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-view.html
- AWS Lambda Developer Guide: Understanding the Lambda execution environment lifecycle - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- AWS Lambda Developer Guide: Monitoring for Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-monitoring.html
- Amazon CloudWatch Logs User Guide: CloudWatch Logs Insights language query syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Amazon CloudWatch Logs User Guide: Boolean, comparison, numeric, datetime, and other functions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- Amazon CloudWatch Logs User Guide: stats - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- Amazon CloudWatch Logs User Guide: Add query to dashboard or export query results - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_ExportQueryResults.html
- Amazon CloudWatch API Reference: Dashboard body structure and log widgets - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html

## Issues Found
- The cold start count examples used `sum(ispresent(@initDuration))`. `ispresent` returns a Boolean, while `sum` is documented for numeric fields. Updated these examples to use `strcontains(@message, "Init Duration")`, which returns `1` or `0` and is also consistent with AWS Lambda's own Logs Insights examples for cold-start percentage.
- The cost estimation query summed billed seconds but told readers to multiply by a per-GB-second price. Updated the query to calculate billed GB-seconds by including `@memorySize / 1024`, and clarified that the price depends on architecture and Region.
- The error-rate query filtered only `REPORT` records and then searched for generic `Error` text in the same `REPORT` message, which misses most application log errors and also used a Boolean expression inside `sum`. Updated it to calculate Lambda `REPORT` failure rate from `Status: error` and `Status: timeout` markers using numeric `case` output.
- The API Gateway query implied CloudWatch automatically adds API Gateway request fields to Lambda logs. Updated the surrounding text to state that the query applies when the application logs those fields.
- The SQS-triggered Lambda query selected `@duration` from application log records. `@duration` is a Lambda `REPORT` field, so it would usually be empty for the logged SQS event line. Removed `@duration` from that fields list.
- The multi-function comparison grouped by `@logStream`, which identifies execution-environment log streams rather than Lambda function names. Updated the query to parse the function name from `@log` and group by `functionName`.

## Review Notes
The post is technically relevant and the remaining query examples align with current CloudWatch Logs Insights QL syntax and AWS Lambda logging behavior. Future improvements could mention Lambda SnapStart separately because SnapStart reports initialization and restore timing differently from standard on-demand cold starts.
