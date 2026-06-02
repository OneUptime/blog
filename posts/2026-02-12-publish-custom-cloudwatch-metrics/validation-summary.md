# Validation Summary: How to Publish Custom CloudWatch Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch custom metrics
- AWS CLI
- Python and Boto3
- Node.js and AWS SDK for JavaScript v3
- CloudWatch statistic sets
- CloudWatch high-resolution metrics
- CloudWatch alarms

## Sources Consulted
- AWS CLI Command Reference: `cloudwatch put-metric-data` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html
- AWS CLI Command Reference: `cloudwatch put-metric-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch User Guide: Metrics concepts - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html
- Amazon CloudWatch User Guide: Publish custom metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html
- Amazon CloudWatch User Guide: CloudWatch service quotas - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_limits.html
- Boto3 CloudWatch `put_metric_data` documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/put_metric_data.html
- AWS SDK for JavaScript v3 `PutMetricDataCommand` documentation - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-cloudwatch/Class/PutMetricDataCommand/
- Amazon CloudWatch Pricing - https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- The post claimed it covered every way to publish custom metrics, but it only covered several common approaches. Changed the wording to avoid overclaiming.
- The Python examples used `datetime.utcnow()`, which is deprecated in current Python. Updated them to use `datetime.now(timezone.utc)`.
- The buffered Python example imported `defaultdict` but did not use it. Removed the unused import.
- The statistic set section said statistic sets preserve the statistical properties of the data. Clarified that they preserve sample count, sum, minimum, and maximum, and noted that percentile statistics require raw values or `Values`/`Counts` in typical cases.
- The alarm example specified only `Environment=prod`, but the published `OrdersProcessed` metric also used `Service=order-api`. Added the `Service` dimension so the alarm targets the actual metric stream.
- The `PutMetricData` quota was listed as 150 transactions per second. Updated it to the current default quota of 500 requests per second per account per region.
- The post described the per-call limit as 1,000 data points. Updated wording to 1,000 metric data structures to match AWS documentation more precisely.

## Review Notes
The local AWS CLI was not installed in this environment, so CLI validation was performed against the official AWS CLI documentation. Pricing is region- and usage-dependent; the $0.30 first-tier custom metric price matched the AWS pricing examples reviewed, but readers should still check the current AWS pricing page for their region.
