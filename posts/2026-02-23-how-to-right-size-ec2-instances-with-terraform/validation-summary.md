# Validation Summary: How to Right-Size EC2 Instances with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Compute Optimizer
- AWS CLI
- Amazon EC2
- Amazon CloudWatch alarms
- Amazon SNS
- AWS Graviton
- Amazon EC2 Auto Scaling
- AWS Lambda
- Amazon EventBridge / CloudWatch Events

## Sources Consulted
- AWS CLI `compute-optimizer get-ec2-instance-recommendations` reference: https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/get-ec2-instance-recommendations.html
- AWS Compute Optimizer API reference: https://docs.aws.amazon.com/compute-optimizer/latest/APIReference/
- Terraform AWS provider `aws_computeoptimizer_enrollment_status` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/computeoptimizer_enrollment_status
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Amazon CloudWatch alarm documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Alarms.html
- Amazon CloudWatch alarm evaluation documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-evaluation.html
- Amazon CloudWatch EC2 metric documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/US_SingleMetricPerInstance.html
- Terraform AWS provider `aws_autoscaling_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_policy
- Amazon EC2 Auto Scaling target tracking documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- Terraform AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS launch template credit specification documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-launchtemplate-creditspecification.html
- AWS Graviton cost optimization guidance: https://docs.aws.amazon.com/prescriptive-guidance/latest/optimize-costs-microsoft-workloads/net-graviton.html
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS provider `aws_cloudwatch_event_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_lambda_permission` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Amazon EventBridge resource-based policy documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html

## Issues Found
1. The AWS CLI query used `recommendationOptions[0].estimatedMonthlySavings.value`, but EC2 instance recommendation savings are nested under `recommendationOptions[0].savingsOpportunity.estimatedMonthlySavings.value`. Updated the JMESPath query so it matches the documented Compute Optimizer output shape.
2. The CloudWatch alarm used `period = 86400` with `evaluation_periods = 14`, creating a 14-day evaluation window. CloudWatch alarms currently have a maximum evaluation period of seven days when the period is at least one hour. Changed the alarm to evaluate seven daily periods.
3. The scheduled Lambda example attached the Lambda function as an EventBridge target but did not grant EventBridge permission to invoke it. Added an `aws_lambda_permission` resource with `principal = "events.amazonaws.com"` and `source_arn` set to the monthly rule ARN.
4. The best-practices section recommended `lifecycle { create_before_destroy = true }` for zero-downtime instance type changes. That is not sufficient for zero downtime on a standalone `aws_instance` and instance type updates may involve stop/start or replacement depending on configuration. Reworded the guidance to recommend Auto Scaling group instance refresh or blue/green replacement.

## Review Notes
- Terraform and AWS CLI were not installed in the local environment, so syntax and behavior were verified against official documentation rather than local `terraform validate` or `aws --help` output.
- `aws_computeoptimizer_enrollment_status` with `status = "Active"` is valid.
- The Compute Optimizer `finding` response value `OVER_PROVISIONED` is consistent with the AWS CLI documentation note about API response values, even though filter input values use `Overprovisioned`.
- The CloudWatch EC2 `CPUUtilization` metric in namespace `AWS/EC2` with the `InstanceId` dimension is valid.
- `python3.11` remains a supported Lambda runtime as of the review date, but newer Python runtimes are available for new functions.
- `aws_cloudwatch_event_rule` / `aws_cloudwatch_event_target` remain valid Terraform resource names for EventBridge because EventBridge was formerly CloudWatch Events.
