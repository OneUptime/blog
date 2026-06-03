# Validation Summary: How to Create CloudWatch Alarms for Billing Thresholds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudWatch billing alarms
- AWS Billing and Cost Management
- AWS CLI
- Amazon SNS
- AWS CloudFormation
- Terraform AWS provider
- AWS Lambda
- Python boto3
- Amazon EC2

## Sources Consulted
- AWS CloudWatch User Guide: Create a billing alarm to monitor your estimated AWS charges: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- AWS Billing User Guide: Customizing your Billing preferences: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CloudFormation Template Reference: AWS::CloudWatch::Alarm: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-alarm.html
- Terraform Registry: aws_cloudwatch_metric_alarm: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm.html
- Boto3 EC2 client describe_instances documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/describe_instances.html
- AWS Lambda Developer Guide: Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html

## Issues Found
- The post showed an AWS CLI command using `aws ce update-cost-allocation-tags-status` to enable billing alerts. That command enables cost allocation tags, not CloudWatch billing alerts. Replaced it with a note that this billing alert preference is enabled in the Billing and Cost Management console.
- The CloudFormation template used `Threshold: !Sub '${AWS::NoValue}'` for the 50% alarm and referenced an undefined `ThresholdMap` for the 80% alarm. Replaced those with explicit `WarningThreshold` and `AlertThreshold` parameters so the template has valid CloudFormation references.
- The Terraform snippet referenced `aws.us_east_1` without declaring the aliased provider. Added a minimal aliased provider block for `us-east-1`.
- The Lambda remediation text implied the function would stop non-essential EC2 instances globally. Clarified that the boto3 EC2 client acts in the Lambda function's Region unless the implementation explicitly iterates through Regions.

## Review Notes
- AWS publishes billing metric data in US East (N. Virginia), and estimated charge metrics use USD, matching the post.
- CloudWatch billing alarms evaluate current estimated charges, not forecasts; AWS Budgets is the appropriate service for forecast-based alerts and budget actions.
- `terraform`, `cfn-lint`, and the AWS CLI were not installed in the local environment, so validation was performed against official documentation rather than local tool execution.
