# Validation Summary: How to Implement Auto-Shutdown for Dev Resources with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS Instance Scheduler on AWS
- AWS CloudFormation
- AWS Lambda
- Amazon EventBridge scheduled rules
- Amazon EC2
- Amazon RDS
- Amazon CloudWatch alarms
- Azure VM auto-shutdown schedules

## Sources Consulted
- AWS Instance Scheduler on AWS CloudFormation templates: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/aws-cloudformation-templates.html
- AWS Instance Scheduler hub stack parameters: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/step-1-launch-the-instance-scheduler-hub-stack.html
- AWS Instance Scheduler schedule reference: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/schedule-reference.html
- AWS Instance Scheduler sample schedules: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/sample-schedules.html
- AWS Instance Scheduler current CloudFormation template: https://s3.amazonaws.com/solutions-reference/instance-scheduler-on-aws/latest/instance-scheduler-on-aws.template
- Amazon EventBridge scheduled rule documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- Amazon EventBridge scheduled rule cron documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- EventBridge Scheduler schedule types: https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html
- Amazon RDS DB instance stop/start documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Terraform AWS provider aws_cloudformation_stack documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack
- Terraform AWS provider aws_cloudwatch_metric_alarm documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AzureRM provider azurerm_dev_test_global_vm_shutdown_schedule documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dev_test_global_vm_shutdown_schedule

## Issues Found
- The AWS Instance Scheduler CloudFormation example used outdated/nonexistent parameters for the current AWS solution template (`CrossAccountRoles` and `ScheduleLambdaAccount`). Updated the parameter map to use current template parameters, including `Namespace`, `UsingAWSOrganizations`, and `Principals`.
- The Instance Scheduler stack creates named IAM resources, so the Terraform example should acknowledge `CAPABILITY_NAMED_IAM`. Updated the CloudFormation stack capabilities accordingly.
- The `Schedule = "office-hours"` tag assumed a schedule existed without saying so. Added a comment clarifying that an Instance Scheduler schedule with that name must be created.
- The custom EventBridge scheduled rule descriptions tied UTC cron expressions to Eastern Standard Time. EventBridge scheduled rules use UTC, so the descriptions were changed to UTC and the surrounding text now notes that daylight saving time requires adjustment or EventBridge Scheduler.
- The RDS section omitted the operational limit that stopped RDS DB instances automatically restart after 7 consecutive days. Added that caveat.

## Review Notes
The Lambda resources reference packaged code through `data.archive_file` but the post intentionally shows infrastructure snippets rather than the Lambda implementation. Future improvements could include a minimal Python handler that honors `KeepRunning=true` and emits the `Custom/DevScheduler` metric used by the alarm example.
