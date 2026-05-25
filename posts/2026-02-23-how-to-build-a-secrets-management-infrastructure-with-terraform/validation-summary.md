# Validation Summary: How to Build a Secrets Management Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Secrets Manager
- AWS KMS
- AWS Lambda
- AWS IAM
- AWS Systems Manager Parameter Store
- AWS CloudTrail and CloudWatch
- Random provider password generation

## Sources Consulted
- Terraform AWS provider documentation for `aws_secretsmanager_secret_rotation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- Terraform AWS provider documentation for `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Terraform AWS provider documentation for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS Secrets Manager documentation for Lambda-based rotation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda.html
- AWS Secrets Manager documentation for Lambda rotation execution role permissions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets-required-permissions-function.html
- AWS Secrets Manager documentation for allowing Secrets Manager to invoke a rotation Lambda: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_turn-on-for-other.html
- AWS Systems Manager Parameter Store KMS encryption documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html
- HashiCorp Terraform documentation for sensitive data and state: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Referenced OneUptime certificate management post: https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-certificate-management-infrastructure-with-terraform/view

## Issues Found
- The reusable module used a `rotation_rules` block inside `aws_secretsmanager_secret`. Rotation rules belong on `aws_secretsmanager_secret_rotation`, so the invalid block was removed.
- Later snippets referenced `module.rds_master_password.secret_id` and `secret_arn`, but the module did not define those outputs. Added `secret_id` and `secret_arn` outputs to make the examples coherent.
- The application database credentials referenced `random_password.app_db.result` without defining `random_password.app_db`. Added the missing password resource.
- The module examples passed `rotation_enabled` and `rotation_days` variables after removing the invalid module-level rotation block. Removed those arguments from the module calls so rotation is configured by `aws_secretsmanager_secret_rotation`.
- The Lambda rotation execution role had Secrets Manager and KMS permissions but lacked the EC2 network interface permissions needed for a Lambda function configured in a VPC, plus basic CloudWatch Logs permissions. Added those IAM actions.
- The Lambda permission allowed Secrets Manager invocation without a source account condition. Added `source_account = var.account_id`, matching AWS confused-deputy guidance for rotation functions.
- The post did not mention that Terraform-managed secret values are present in Terraform state. Added a concise state-protection caveat after the module snippet.

## Review Notes
The examples remain illustrative rather than a complete drop-in module: variable declarations, provider configuration, security group rules, database-specific rotation Lambda implementation, and app-specific secret modules such as `module.api_key_stripe` are still assumed. The referenced certificate-management link resolves to a relevant OneUptime post.
