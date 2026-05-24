# Validation Summary: How to Handle RDS Password Rotation with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp)
- Terraform AWS provider (`hashicorp/aws`)
- Terraform Random provider (`hashicorp/random`)
- AWS RDS (PostgreSQL)
- AWS Secrets Manager (including managed master user password feature)
- AWS Lambda (Python 3.11 runtime)
- AWS IAM
- AWS KMS
- AWS VPC, security groups, and VPC interface endpoints

## Sources Consulted
- Terraform AWS provider documentation — `aws_db_instance`, `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_secretsmanager_secret_rotation`, `aws_lambda_function`, `aws_lambda_permission`, `aws_security_group_rule`, `aws_vpc_endpoint`, `aws_kms_key` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- Terraform Random provider documentation — `random_password` (https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password)
- AWS Secrets Manager rotation documentation (https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- AWS RDS managed master user password documentation (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html)
- AWS Lambda runtime support policy (https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
- AWS RDS PostgreSQL password character restrictions (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)

## Issues Found
No technical issues found.

Verified specifically:
- All `aws_db_instance` arguments are valid for the AWS provider. The first instance uses a `password` argument with `lifecycle.ignore_changes = [password]` (correct pattern for external rotation). The second `managed_password` instance correctly uses `manage_master_user_password = true` *without* a `password` argument — these are mutually exclusive, and the post handles this correctly.
- `master_user_secret[0].secret_arn` is the correct attribute path for accessing the managed master user secret ARN.
- `random_password` `override_special` characters (`!#$%^&*()-_=+[]{}|:,.<>?`) correctly exclude `/`, `@`, `"`, and space, which are disallowed in RDS PostgreSQL master passwords.
- Python 3.11 Lambda runtime is still in standard support (end of standard support ~June 2027).
- `aws_secretsmanager_secret_rotation` with `rotation_lambda_arn` and `rotation_rules.automatically_after_days` is correct. (`rotation_lambda_arn` is deprecated on `aws_secretsmanager_secret` itself, but remains the correct argument on the dedicated rotation resource used here.)
- `aws_lambda_permission` with `principal = "secretsmanager.amazonaws.com"` and `source_arn` set to the secret ARN is the correct invocation grant for Secrets Manager rotation.
- IAM policy actions for the rotation Lambda match AWS's documented requirements for rotation functions (`DescribeSecret`, `GetSecretValue`, `PutSecretValue`, `UpdateSecretVersionStage`, `GetRandomPassword`).

## Review Notes
- `aws_security_group_rule` is still functional but the AWS provider (v5+) recommends `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` for new code. Not incorrect, just no longer the preferred resource.
- The post does not include the actual `rotation_lambda.zip` source code — it assumes the reader provides one. In practice, most users deploy the AWS-published Serverless Application Repository rotation template (e.g., `SecretsManagerRDSPostgreSQLRotationSingleUser`). The post mentions this in a comment but does not show the SAR deployment; that is a content-completeness note, not a technical error.
- On the very first apply that creates an `aws_db_instance` with `manage_master_user_password = true`, the output reading `master_user_secret[0].secret_arn` is populated within the same apply (the attribute is set by the create response), so it works in a single apply for fresh resources. Toggling an existing instance from `false` to `true` can occasionally exhibit an "Invalid index" race in older provider versions, but this is not the scenario the post describes.
- The RDS security group lacks an explicit `egress` block. The Terraform `aws_security_group` resource defaults to no egress rules when none are specified (unlike the AWS console default of "allow all"). For RDS this is typically fine since the database initiates no outbound connections, but readers copying the snippet for other workloads should be aware.
