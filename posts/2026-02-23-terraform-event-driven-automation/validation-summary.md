# Validation Summary: How to Use Terraform with Event-Driven Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Cloud API
- AWS EventBridge / CloudWatch Events
- AWS Lambda
- AWS Security Hub CSPM
- Amazon EC2 Auto Scaling
- Amazon CloudWatch alarms
- AWS Step Functions
- Amazon DynamoDB

## Sources Consulted
- HCP Terraform Runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform Workspace Variables API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HCP Terraform API-driven run workflow: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/api
- AWS EventBridge event buses: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html
- AWS EventBridge events: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events.html
- AWS Security Hub CSPM EventBridge rules: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-all-findings.html
- AWS Security Hub EventBridge V2 event types: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-cwe-event-types.html
- AWS CloudWatch alarm actions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html
- AWS CloudWatch alarm events and EventBridge: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-and-eventbridge.html
- AWS Step Functions Wait state: https://docs.aws.amazon.com/step-functions/latest/dg/state-wait.html
- Terraform AWS provider `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_sfn_state_machine`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sfn_state_machine
- Terraform AWS provider `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Referenced OneUptime Terraform pipeline post: https://oneuptime.com/blog/post/2025-12-20-terraform-pipeline-github-actions/view

## Issues Found
- AWS service EventBridge rules were attached to a custom event bus. AWS service events are delivered to the account's default event bus, so I changed the example to use default-bus rules and clarified that custom buses are for custom application events sent with PutEvents.
- The Security Hub EventBridge target sent the raw finding event to a Lambda handler that expected `action` and `workspace` fields. I added a constant target input so the handler receives the expected remediation action.
- EventBridge targets for Lambda were missing `aws_lambda_permission` resources. I added permissions for the Security Hub, EC2 termination, and CloudWatch alarm rules.
- The Lambda example created workspace variables before each run even though the Runs API supports run-specific variables, and the Workspace Variables API separates create and update operations. I changed the example to pass event variables in the `POST /runs` payload.
- The auto-scaling Terraform snippet referenced `var.subnet_ids` without declaring it. I added a `subnet_ids` variable.
- The CloudWatch alarm example described EventBridge scaling but only configured an SNS alarm action. I changed it to use a CloudWatch alarm state-change EventBridge rule that targets the Terraform trigger Lambda.

## Review Notes
- The Terraform CLI was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The Python Lambda snippet was parsed successfully with Python `ast`.
- The snippets are illustrative and still assume surrounding resources such as the Lambda function, IAM roles, launch template, and provider configuration exist.
