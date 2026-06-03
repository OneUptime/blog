# Validation Summary: How to Access Secrets Manager Secrets from ECS Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon ECS
- AWS Fargate
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS IAM
- AWS KMS
- Amazon EventBridge
- AWS CloudTrail
- AWS CLI
- Terraform AWS Provider
- Python boto3

## Sources Consulted
- Amazon ECS Developer Guide: Pass Secrets Manager secrets through Amazon ECS environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Amazon ECS Developer Guide: Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS Secrets Manager API Reference: GetSecretValue: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
- AWS Secrets Manager User Guide: Match AWS Secrets Manager events with Amazon EventBridge: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-eventbridge.html
- AWS Secrets Manager User Guide: AWS CloudTrail entries for Secrets Manager: https://docs.aws.amazon.com/secretsmanager/latest/userguide/cloudtrail_log_entries.html
- AWS CLI Command Reference: ecs update-service: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- Terraform AWS Provider: aws_cloudwatch_event_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS Provider: aws_db_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Boto3 documentation: SecretsManager get_secret_value: https://docs.aws.amazon.com/boto3/latest/reference/services/secretsmanager/client/get_secret_value.html

## Issues Found
- The explanation of the trailing colons in the ECS Secrets Manager ARN said version-stage and version-id default to `AWSCURRENT` and latest. Updated it to say that omitting both retrieves the version with the `AWSCURRENT` staging label, matching ECS and Secrets Manager documentation.
- The Terraform example used `aws_db_instance.production.endpoint` for `DB_HOST`. Terraform's RDS `endpoint` attribute includes `address:port`, so this was changed to `aws_db_instance.production.address`.
- The EventBridge rotation redeploy example matched the `RotateSecret` API call. That triggers when rotation is requested, not when a secret has successfully rotated. Updated it to match the Secrets Manager `RotationSucceeded` service event via CloudTrail.
- The Parameter Store alternative did not mention the required ECS task execution role permission. Added a short note that Parameter Store values require `ssm:GetParameters` on the parameter ARN.

## Review Notes
The ECS secret injection examples are syntactically valid. The post could later mention Fargate platform version requirements for JSON-key secret injection, but the current Fargate task definition does not pin an older platform version, so this is a caveat rather than a correction.
