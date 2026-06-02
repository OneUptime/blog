# Validation Summary: How to Set Up RDS with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS for PostgreSQL
- Terraform
- HashiCorp AWS Provider
- AWS IAM
- Amazon CloudWatch alarms
- Amazon SNS alarm actions
- AWS KMS
- AWS Secrets Manager

## Sources Consulted
- HashiCorp Terraform AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance.html
- HashiCorp Terraform AWS Provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- HashiCorp Terraform CLI `init` documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform CLI `plan` documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Amazon RDS Enhanced Monitoring documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- Amazon RDS password management with AWS Secrets Manager documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- Amazon RDS for PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html
- Amazon RDS DB instance storage documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon RDS Performance Insights documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Enabling.html

## Issues Found
- The RDS instance used `engine_version = "16.2"`, which is no longer listed as a currently creatable RDS for PostgreSQL minor version. Updated it to `16.13`, which the RDS release calendar lists under standard support.
- The snippet accepted `master_password` as a Terraform variable while the comment said passwords should be managed through AWS Secrets Manager. Updated the configuration to use `manage_master_user_password = true` and `master_user_secret_kms_key_id`, removed the password variable and password lifecycle workaround, and added an output for the RDS-managed Secrets Manager secret ARN.
- The CloudWatch alarm resources referenced `var.alarm_sns_topic_arns`, but the variable was not declared. Added the missing variable with an empty-list default.
- The example `production.tfvars` omitted required variables needed by the shown configuration. Added placeholder values for `private_subnet_ids`, `vpc_id`, and `kms_key_arn`.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`; the review was performed against official AWS and HashiCorp documentation.
- AWS has announced that the RDS Performance Insights console experience and flexible retention pricing will no longer be supported after June 30, 2026. The current Terraform arguments remain valid, but future updates should consider CloudWatch Database Insights guidance.
