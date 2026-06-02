# Validation Summary: How to Monitor AWS Account API Usage with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudTrail
- Amazon CloudWatch
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- CloudWatch metric filters and alarms
- AWS/Usage API usage metrics
- AWS CLI
- AWS IAM
- AWS CloudFormation
- AWS Lambda
- Amazon SNS

## Sources Consulted
- AWS CloudTrail documentation: Sending events to CloudWatch Logs - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html
- AWS CloudTrail documentation: Role policy document for CloudTrail to use CloudWatch Logs - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-required-policy-for-cloudwatch-logs.html
- AWS CLI Command Reference: cloudtrail update-trail - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/update-trail.html
- Amazon CloudWatch documentation: AWS API usage metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AWS-API-Usage-Metrics.html
- Amazon CloudWatch documentation: CloudWatch usage metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Usage-Metrics.html
- Amazon EC2 Developer Guide: Monitor Amazon EC2 API requests using Amazon CloudWatch - https://docs.aws.amazon.com/ec2/latest/devguide/monitor.html
- Amazon CloudWatch Logs documentation: Filter pattern syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Amazon CloudWatch Logs documentation: Use aliases and comments in queries - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-alias.html
- Amazon CloudWatch documentation: Dashboard body structure and syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- AWS CloudFormation documentation: AWS::Logs::MetricFilter and MetricTransformation - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-logs-metricfilter.html

## Issues Found
- The IAM policy JSON included a JavaScript-style `//` comment, which is not valid JSON. Removed the inline comment from the JSON code block.
- The CloudTrail CloudWatch Logs IAM policy used a log-group wildcard ARN for `logs:CreateLogStream` and `logs:PutLogEvents`. Updated it to target CloudTrail log stream ARNs, matching AWS CloudTrail documentation.
- The CloudWatch dashboard JSON included a JavaScript-style `//` comment, which is not valid JSON. Removed the inline comment from the JSON code block.
- The Logs Insights query examples used SQL-style `--` comments. CloudWatch Logs Insights documents `#` as the supported comment syntax, so the examples were updated to use `#`.

## Review Notes
- The AWS CLI examples and CloudFormation resource/property names are consistent with current AWS documentation.
- The AWS/Usage examples use valid documented dimensions for API usage metrics. EC2 also has an opt-in `AWS/EC2/API` namespace for deeper EC2 API request metrics, but the post's AWS/Usage examples are still technically valid for quota-oriented API usage monitoring.
- The Lambda example correctly notes that a production implementation should avoid fixed sleeps and poll query status or use Step Functions.
