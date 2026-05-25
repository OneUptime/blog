# Validation Summary: How to Create CloudWatch RUM App Monitors in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon CloudWatch RUM
- Amazon Cognito Identity Pools
- AWS IAM
- Amazon CloudWatch metrics and alarms
- Amazon SNS
- AWS X-Ray

## Sources Consulted
- Terraform Registry: `aws_rum_app_monitor` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rum_app_monitor
- AWS CloudWatch User Guide: CloudWatch metrics that you can collect with CloudWatch RUM: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-metrics.html
- AWS CloudWatch User Guide: Authorize your web application to send data to AWS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-get-started-authorization.html
- AWS CLI Command Reference: `rum create-app-monitor`: https://docs.aws.amazon.com/cli/latest/reference/rum/create-app-monitor.html
- AWS CloudFormation Template Reference: `AWS::RUM::AppMonitor CustomEvents`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-rum-appmonitor-customevents.html

## Issues Found
- The post stated that RUM requires a Cognito Identity Pool for browser authentication. AWS documents multiple authentication options, including Cognito, third-party credentials, and resource-based policies. Changed the wording to say that the example uses a Cognito Identity Pool.
- The production sampling example used `favorite_pages` while describing it as a way to only monitor specific pages. Terraform and AWS define `favorite_pages` as pages shown with a favorite icon in the CloudWatch RUM console. Changed the example to use `included_pages`, which is the documented filtering field for collecting data only from selected pages.
- The HTTP alarm used `HttpErrorCount`, which is not a documented CloudWatch RUM metric. Changed it to `Http5xxCount` and updated the surrounding comment and description.
- The best-practices paragraph recommended `favorite_pages` to focus monitoring on critical paths. Changed it to `included_pages` to match the intended behavior.

## Review Notes
The Terraform resource structure, telemetry values, custom events block, Cognito unauthenticated role pattern, `rum:PutRumEvents` permission, RUM namespace, `application_name` dimension, and JavaScript/error/frustrated-navigation metrics were checked against official documentation and are technically valid. The examples intentionally omit some production details, such as SNS subscriptions and the frontend snippet installation, but those omissions do not make the shown Terraform incorrect.
