# Validation Summary: How to Create Custom CloudWatch Metrics from Lambda

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch custom metrics
- CloudWatch PutMetricData API
- CloudWatch Embedded Metric Format (EMF)
- AWS SDK for JavaScript v3
- aws-embedded-metrics for Node.js
- aws-embedded-metrics for Python
- AWS CLI CloudWatch alarms

## Sources Consulted
- AWS CLI `cloudwatch put-metric-data` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html
- Amazon CloudWatch PutMetricData API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricData.html
- Amazon CloudWatch Embedded Metric Format overview: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html
- Amazon CloudWatch Embedded Metric Format specification: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
- Amazon CloudWatch metrics concepts and high-resolution metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html
- AWS Lambda CloudWatch metrics documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- AWS CLI `cloudwatch put-metric-alarm` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- awslabs aws-embedded-metrics-node documentation: https://github.com/awslabs/aws-embedded-metrics-node
- awslabs aws-embedded-metrics-python documentation: https://github.com/awslabs/aws-embedded-metrics-python

## Issues Found
- The post described EMF as "zero additional API calls" and "no API calls needed." AWS documents that EMF avoids `cloudwatch:PutMetricData` but metrics are generated from CloudWatch Logs, which uses log ingestion. Reworded the claims to say there is no `PutMetricData` API call from the Lambda function.
- The post said EMF is free beyond normal log costs and that you pay for log ingestion but not metric-related costs. AWS documents that EMF incurs charges for log ingestion/storage and for generated custom metrics. Updated the cost language to include custom metric charges while preserving the point that EMF avoids `PutMetricData` request charges.
- The slow processing alarm used `--statistic p99`. AWS CLI documents percentile statistics under `--extended-statistic`, while `--statistic` only accepts `SampleCount`, `Average`, `Sum`, `Minimum`, or `Maximum`. Changed the alarm to `--extended-statistic p99`.
- The metric math alarm omitted `ReturnData`. AWS CLI documentation says the expression watched by the alarm is designated by setting `ReturnData` to true. Added `ReturnData: false` to source metrics and `ReturnData: true` to the error-rate expression.
- The Python EMF example returned `json.dumps(order)` but did not import `json`. Added the missing import.

## Review Notes
The remaining examples are technically valid but assume user-provided functions such as `processOrder`, `process_order`, `getUser`, and `emitMetric`, plus configured AWS credentials, IAM permissions, log delivery, and existing SNS/action resources. High-cardinality dimension guidance is correct and especially important because each unique dimension combination creates a distinct custom metric.
