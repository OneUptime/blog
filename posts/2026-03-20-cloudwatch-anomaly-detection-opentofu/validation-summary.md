# Validation Summary: How to Set Up CloudWatch Anomaly Detection with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS CloudWatch
- AWS CLI
- AWS Lambda
- Amazon API Gateway

## Sources Consulted
- AWS CloudWatch anomaly detection user guide: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html
- AWS guide for creating anomaly detection alarms: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Anomaly_Detection_Alarm.html
- AWS CLI `describe-anomaly-detectors` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/describe-anomaly-detectors.html
- Amazon API Gateway metrics and dimensions: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- AWS Lambda metric types: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS provider `aws_cloudwatch_metric_alarm` resource reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The prerequisites stated that anomaly detection needs at least 2 weeks of existing metric data. I corrected this to reflect AWS documentation: CloudWatch trains on up to 2 weeks of historical data, but anomaly detection can be enabled even when the metric has less history.
- Step 1 said it was creating an anomaly detector, but the OpenTofu example is creating an anomaly detection alarm with `aws_cloudwatch_metric_alarm`. I updated the section title and code comment to match what the snippet actually provisions.
- The API Gateway traffic drop example used `stat = "Sum"` for the `Count` metric. I changed this to `stat = "SampleCount"` because AWS documents `SampleCount` as the statistic that represents total request count for that metric.
- The conclusion said to allow 2-3 weeks for the model to learn before trusting alerts. I updated this to match current AWS behavior: a new model can take up to 3 hours for the actual band to appear and up to 2 weeks to train for more accurate expected values.

## Review Notes
- The `describe-anomaly-detectors` CLI example is valid as written. The command filters by namespace, metric name, and dimensions; the response includes the detector `Stat`, but the CLI command itself does not accept a `--stat` filter.
