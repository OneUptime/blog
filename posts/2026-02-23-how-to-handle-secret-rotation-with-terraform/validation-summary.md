# Validation Summary: How to Handle Secret Rotation with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, AWS provider)
- AWS Secrets Manager (`aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_secretsmanager_secret_rotation`)
- AWS Lambda (Python 3.12 runtime, VPC config)
- AWS IAM (roles, policies, trust policies)
- AWS VPC (security groups, `aws_vpc_security_group_ingress_rule`, interface VPC endpoints)
- AWS KMS (CMK encryption for secrets)
- AWS CloudWatch (metric alarms)
- AWS RDS (PostgreSQL)
- `random_password` resource (hashicorp/random)

## Sources Consulted
- HashiCorp Terraform AWS Provider docs for `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_secretsmanager_secret_rotation`, `aws_lambda_function`, `aws_lambda_permission`, `aws_vpc_security_group_ingress_rule`, `aws_vpc_endpoint`, `aws_cloudwatch_metric_alarm`
- AWS Secrets Manager User Guide — Monitoring AWS Secrets Manager with Amazon CloudWatch (metrics published)
- AWS Secrets Manager User Guide — Rotating your AWS Secrets Manager secrets (alternating-users / multi-user strategy)
- AWS Lambda runtime support documentation (Python 3.12)
- AWS EventBridge documentation for Secrets Manager rotation events
- AWS Secrets Manager interface VPC endpoint service name format (`com.amazonaws.<region>.secretsmanager`)

## Issues Found

1. **Non-existent CloudWatch metric for rotation failures.** The original "Monitoring Rotation" section defined an alarm on `metric_name = "RotationFailed"` in the `AWS/SecretsManager` namespace. AWS Secrets Manager does not publish a `RotationFailed` metric — the only native metric it publishes is `SecretCount`. Rotation failures should be detected either through the rotation Lambda's `Errors` metric (`AWS/Lambda` namespace) or via EventBridge rules on the Secrets Manager `RotationFailed` event. **Fix:** rewrote the alarm to monitor the rotation Lambda's `Errors` metric (with a `FunctionName` dimension) and added a short note about the EventBridge alternative.

2. **Inverted comparison operator on `DaysSinceLastRotation` alarm.** The "secret-expiring-soon" alarm used `comparison_operator = "LessThanThreshold"` with `threshold = 25` and a comment stating "Alert 5 days before 30-day rotation." For a metric named `DaysSinceLastRotation`, alerting 5 days before the 30-day rotation means alerting when the value exceeds 25, not when it falls below 25. **Fix:** changed `LessThanThreshold` to `GreaterThanThreshold` and clarified in a comment that the metric is custom and emitted by the user.

## Review Notes
- `aws_secretsmanager_secret_rotation` does not establish an implicit dependency on `aws_lambda_permission.secrets_manager`. On a first apply, Terraform can attempt to validate the rotation configuration (which triggers a test invocation) before the permission exists, causing failures. Adding `depends_on = [aws_lambda_permission.secrets_manager]` to the rotation resource is a common best-practice but was not flagged as an error since the post does not claim apply ordering is automatic.
- The post references a `multi_user_rotation` Lambda function in the alternating-users section without showing its definition. This is fine as a snippet for clarity, but readers should know they need to supply a separate Lambda (or one of AWS's pre-built `SecretsManagerRDSPostgreSQLRotationMultiUser` serverless application templates) to make that example work end-to-end.
- The `python3.12` Lambda runtime is currently supported (deprecation: 2028-10-31). Future readers should check AWS Lambda's runtime support page before reusing this exact value.
- The `random_password.initial` resource will be regenerated on Terraform plan if its arguments change; combined with `ignore_changes = [secret_string]`, this is intentional — but readers should know `terraform taint` or replacing the random_password will not push a new value into the rotated secret.
- The `SECRETS_MANAGER_ENDPOINT` environment variable on the rotation Lambda is a convention used by AWS's pre-built rotation Lambda templates; this is correct for those templates but isn't required if you write your own handler that uses the default SDK endpoint resolution.
