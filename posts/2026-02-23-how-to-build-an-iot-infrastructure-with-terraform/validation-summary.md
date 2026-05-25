# Validation Summary: How to Build an IoT Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS IoT Core
- AWS IoT fleet provisioning
- AWS IoT Rules
- Amazon Kinesis Data Streams
- AWS Lambda
- Amazon DynamoDB
- Amazon S3 lifecycle configuration
- Amazon CloudWatch alarms and metrics
- Amazon SNS

## Sources Consulted
- Terraform AWS Provider `aws_iot_topic_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_topic_rule
- Terraform AWS Provider `aws_iot_provisioning_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_provisioning_template
- Terraform AWS Provider `aws_iot_thing_type` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing_type
- Terraform AWS Provider `aws_lambda_event_source_mapping` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS Provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS Provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider `aws_kinesis_stream` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_stream
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS IoT Core policy documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html
- AWS IoT Core thing policy variables documentation: https://docs.aws.amazon.com/iot/latest/developerguide/thing-policy-variables.html
- AWS IoT Core action resources documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-action-resources.html
- AWS IoT Core provisioning template documentation: https://docs.aws.amazon.com/iot/latest/developerguide/provision-template.html
- AWS IoT Core substitution templates documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-substitution-templates.html
- AWS IoT SQL functions documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-functions.html
- AWS IoT metrics and dimensions documentation: https://docs.aws.amazon.com/iot/latest/developerguide/metrics_dimensions.html

## Issues Found
- The architecture list described DynamoDB as storing device shadows. AWS IoT Device Shadow is an AWS IoT Core feature, while the article's DynamoDB examples store device status and metrics. Changed the wording to "device status and operational state."
- The IoT Core setup text said it configured the IoT Core endpoint, but the code only configures thing types and policies. Updated the sentence to match the code.
- The IoT policy used thing policy variables for `iot:Connect` without explicitly requiring the principal to be attached to the thing. Added the `iot:Connection.Thing.IsAttached` condition, matching AWS IoT's recommended pattern for registered devices.
- The IoT rule Lambda action did not include the Lambda resource-based permission required for AWS IoT Rules to invoke the Lambda function. Added an `aws_lambda_permission` example scoped to the rule ARN.
- The Lambda processor referenced `aws_dynamodb_table.device_metrics`, but the post did not define that table. Added a DynamoDB metrics table with `deviceId` and `timestamp` keys.
- The CloudWatch rule action alarm used `RuleActionFailure`, which is not the current AWS IoT metric name. Changed it to the documented `Failure` rule-action metric and added rule/action dimensions.
- The "disconnected devices" alarm used `Connect.AuthError`, which measures unauthorized connection requests rather than disconnections. Renamed the example to unauthorized connection attempts and added the `Protocol` dimension.

## Review Notes
The Terraform snippets are still illustrative rather than a complete standalone module; they reference supporting IAM roles, Lambda packages, buckets, and variables that are not fully defined in the post. The resource arguments and AWS service concepts shown are current based on the official documentation reviewed.
