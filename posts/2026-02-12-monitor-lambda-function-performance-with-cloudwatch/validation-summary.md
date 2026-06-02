# Validation Summary: How to Monitor Lambda Function Performance with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch metrics
- Amazon CloudWatch alarms
- Amazon CloudWatch dashboards
- Amazon CloudWatch Logs Insights
- AWS CLI
- AWS CloudFormation
- Amazon SNS
- JavaScript / Node.js Lambda logging

## Sources Consulted
- AWS Lambda: Using CloudWatch metrics with Lambda - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- AWS Lambda: Types of metrics for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS Lambda: Viewing metrics for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html
- AWS Lambda: Viewing CloudWatch logs for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-view.html
- AWS Lambda: Log and monitor Node.js Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html
- Amazon CloudWatch: Dashboard body structure and syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch Logs: Logs Insights query syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Amazon CloudWatch Logs: Logs Insights operations and functions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- Amazon CloudWatch Logs: stats command - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- AWS CLI: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CloudFormation: AWS::CloudWatch::Alarm - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-alarm.html
- AWS CloudFormation: AWS::Logs::LogGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-logs-loggroup.html
- Amazon CloudWatch: Create a billing alarm to monitor your estimated AWS charges - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- AWS Lambda Pricing - https://aws.amazon.com/lambda/pricing/

## Issues Found
- The built-in metrics section said the listed metrics were available at both function and alias/version level. This was too broad because `UnreservedConcurrentExecutions` is a regional concurrency metric. Updated the text to describe the documented metric dimensions and call out the regional metric.
- The Duration metric was described as generic execution time. AWS documents Lambda `Duration` as handler processing time and notes it does not include cold start time, so the table now says handler execution time.
- The CloudFormation alarm examples used `!Sub "${FunctionName}-..."` for alarm names, but the snippet did not define a `FunctionName` variable or parameter. Changed these substitutions to `${MyFunction}`, matching the referenced Lambda resource used in the metric dimensions.
- The Logs Insights "Calculate error rate" query filtered only `REPORT` lines and then counted `ERROR` strings in those lines, which would not calculate Lambda function errors correctly. Replaced it with a valid query for finding recent error log entries.
- The memory utilization query divided `@maxMemoryUsed` by `1000000`, but Lambda Logs Insights exposes `@maxMemoryUsed` and `@memorySize` in comparable MB values from REPORT logs. Removed the incorrect conversion.
- The cost-monitoring query was labeled as estimating cost but only showed billed seconds and memory. Updated the comment to "Track Lambda usage inputs" and added `totalGBSeconds`, which matches Lambda's duration-and-memory billing model.

## Review Notes
The post is technically sound after the corrections. Billing alarms in the `AWS/Billing` namespace require billing alerts to be enabled and must be configured in US East (N. Virginia); the post mentions billing alarms only briefly, so that caveat could be expanded in a future revision.
