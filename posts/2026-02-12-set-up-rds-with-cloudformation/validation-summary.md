# Validation Summary: How to Set Up RDS with CloudFormation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- Amazon RDS for PostgreSQL
- Amazon EC2 security groups
- AWS IAM roles
- Amazon CloudWatch alarms and logs
- Amazon SNS
- AWS CLI

## Sources Consulted
- AWS CloudFormation `AWS::RDS::DBInstance` template reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html
- AWS CloudFormation `DeletionPolicy` attribute reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- AWS CloudFormation condition functions reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-condition.html
- AWS CloudFormation `AWS::RDS::EventSubscription` template reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-eventsubscription.html
- Amazon RDS for PostgreSQL CloudWatch Logs export documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.PostgreSQL.html
- AWS CLI `cloudformation create-stack` / `update-stack` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/update-stack.html
- AWS CLI `cloudformation create-change-set` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- Amazon RDS Performance Insights end-of-support notice: https://aws.amazon.com/rds/performance-insights/
- OneUptime linked Terraform article: https://oneuptime.com/blog/post/2026-02-12-set-up-rds-with-terraform/view
- OneUptime linked Performance Insights article: https://oneuptime.com/blog/post/2026-02-12-monitor-rds-with-performance-insights/view

## Issues Found
- The template used `!If` directly in the `DeletionPolicy` attribute. AWS documents `Fn::If` support for resource properties, outputs, metadata, and update policies, while `DeletionPolicy` is a resource attribute with literal policy values. Changed it to `DeletionPolicy: Snapshot`, which is valid for `AWS::RDS::DBInstance`.
- The `PrivateSubnetIds` AWS CLI parameter used shell-escaped quotes around a comma-separated list. AWS CLI shorthand examples escape commas inside a single parameter value. Changed the example to `ParameterValue=subnet-abc123\\,subnet-def456`.
- The `update-stack` example provided only the changed instance class and password parameter. AWS CLI documentation states that unspecified parameter keys use template defaults; required parameters without defaults can fail, and optional parameters could be reset. Added `UsePreviousValue=true` for the other stack parameters.
- The post said CloudFormation will show a change set before applying an `update-stack`. The AWS CLI `update-stack` command starts the update directly. Updated the text to explain that users should create and review a change set separately before execution.
- AWS has announced that the RDS Performance Insights console experience and flexible retention period pricing will no longer be supported starting June 30, 2026. Updated the closing sentence to mention CloudWatch Database Insights as the forward-looking monitoring option.

## Review Notes
The template still uses PostgreSQL engine version `16.2`, which is syntactically valid but no longer a current minor version. For a real production deployment, readers should verify current regional RDS PostgreSQL engine versions and orderable instance classes before deployment.
