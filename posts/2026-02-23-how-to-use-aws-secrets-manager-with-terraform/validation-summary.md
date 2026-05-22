# Validation Summary: How to Use AWS Secrets Manager with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- HashiCorp Random Provider
- AWS Secrets Manager
- AWS Lambda
- AWS IAM
- AWS KMS
- Amazon ECS
- AWS CloudTrail
- Amazon CloudWatch Logs

## Sources Consulted
- Terraform AWS Provider documentation for `aws_secretsmanager_secret`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- Terraform AWS Provider documentation for `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Terraform AWS Provider documentation for `aws_secretsmanager_secret_rotation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- Terraform AWS Provider documentation for `aws_secretsmanager_secret_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_policy
- Terraform Random Provider documentation for `random_password`: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Terraform documentation for managing sensitive data: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- AWS Secrets Manager documentation for Lambda rotation functions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html
- AWS Secrets Manager documentation for rotation function templates: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_available-rotation-templates.html
- AWS Secrets Manager cross-account access documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples_cross.html
- AWS Secrets Manager resource-based policy documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-policies.html
- Amazon ECS documentation for injecting Secrets Manager secrets into environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- AWS Secrets Manager CloudTrail logging documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudtrail.html

## Issues Found
- The introduction implied Terraform can create and reference secrets without exposing actual values in plain text. I changed this to clarify that Terraform avoids hardcoding values in configuration, but secret values can still be stored in Terraform state and state must be protected or write-only attributes used where available.
- The rotation section described AWS-provided RDS rotation Lambda functions as "pre-built." I changed the wording to AWS-provided rotation Lambda function templates and clarified that the referenced Lambda function must be deployed from a template or custom implementation.
- The cross-account example stated that the secret's KMS key needs a cross-account policy but did not show the secret using that customer-managed KMS key. I added an `aws_secretsmanager_secret` example with `kms_key_id = aws_kms_key.secrets.arn`, because AWS does not support cross-account access with the AWS managed `aws/secretsmanager` key.
- The ECS section heading and conclusion claimed EKS and Lambda application integration, but the post only showed ECS container injection. I narrowed the heading and conclusion to ECS.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` or `terraform fmt` against extracted examples. The HCL snippets were reviewed manually against current provider and AWS documentation. The `secret_string_wo` write-only argument is preferable for newer Terraform/provider workflows when avoiding secret persistence in state is a requirement, but the existing `secret_string` example remains valid if state is treated as sensitive.
