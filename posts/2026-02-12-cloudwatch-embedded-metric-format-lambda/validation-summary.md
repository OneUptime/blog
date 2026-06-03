# Validation Summary: How to Use CloudWatch Embedded Metric Format in Lambda

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudWatch Embedded Metric Format
- Amazon CloudWatch Logs
- Amazon CloudWatch custom metrics
- AWS Lambda
- Node.js
- Python
- `aws-embedded-metrics` client libraries
- CloudWatch Logs Insights

## Sources Consulted
- AWS CloudWatch Embedded Metric Format overview: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html
- AWS CloudWatch Embedded Metric Format specification: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
- AWS CloudWatch EMF publishing options: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Generation.html
- AWS CloudWatch service quotas: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_limits.html
- AWS CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- AWS CloudWatch cost documentation for EMF and API requests: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_billing.html
- `awslabs/aws-embedded-metrics-node` README and API documentation: https://github.com/awslabs/aws-embedded-metrics-node
- `awslabs/aws-embedded-metrics-python` README and API documentation: https://github.com/awslabs/aws-embedded-metrics-python

## Issues Found
- The post described EMF as having no extra costs. AWS documentation states that EMF avoids direct `PutMetricData` calls, but CloudWatch Logs ingestion/archive charges and generated custom metric charges still apply. Updated the description, introduction, and comparison table to reflect that accurately.
- The post said EMF has no API calls, no latency, and no throttling concerns. Refined this to the accurate claim that Lambda code does not call `PutMetricData`, so it avoids synchronous metric API latency and `PutMetricData` throttling.
- The Node.js multiple-dimension-set example used `metrics.setDimensions(obj, obj, obj)`. The current `aws-embedded-metrics-node` API documents multiple dimension sets as an array passed to `setDimensions`. Updated the example to `metrics.setDimensions([...])`.
- The comparison table listed `PutMetricData` throttling as 150 TPS per account/region. Current AWS CloudWatch quotas list `PutMetricData` at 500 requests per second per account/region. Updated the table.
- The comparison table said EMF outside Lambda "needs CloudWatch agent" and implied `PutMetricData` is the main option outside Lambda. AWS documents EMF publishing via the CloudWatch agent or the `PutLogEvents` API. Updated the table and guidance accordingly.
- The tips section said each EMF log line can contain up to 100 metrics and 30 dimensions, and that `_aws.Timestamp` is optional. The EMF specification defines the limit as 100 metric definitions per metric directive and 30 dimension keys per dimension set, and documents `_aws.Timestamp` as the metric timestamp in milliseconds. Updated the wording.

## Review Notes
The remaining examples are intentionally illustrative and rely on placeholder business functions such as `processOrder` and `processRequest`. They are syntactically reasonable for tutorial snippets, but are not standalone runnable Lambda functions without those application-specific functions.
