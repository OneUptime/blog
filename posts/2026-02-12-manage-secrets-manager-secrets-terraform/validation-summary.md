# Validation Summary: How to Manage Secrets Manager Secrets with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Secrets Manager
- Terraform AWS provider
- Terraform Random provider
- AWS KMS
- AWS IAM
- AWS Lambda secret rotation
- Amazon RDS secret rotation
- AWS SDK for Python (Boto3)
- AWS Systems Manager Parameter Store

## Sources Consulted
- AWS Secrets Manager pricing: https://aws.amazon.com/secrets-manager/pricing/
- AWS Secrets Manager encryption and KMS key behavior: https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- AWS Secrets Manager cross-account access: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples_cross.html
- AWS Secrets Manager rotation overview: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html
- AWS Secrets Manager managed rotation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_managed.html
- AWS Secrets Manager rotation Lambda templates: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_available-rotation-templates.html
- AWS Secrets Manager rotation Lambda execution role permissions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets-required-permissions-function.html
- AWS Secrets Manager JSON structure for RDS/Aurora rotation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_secret_json_structure.html
- AWS Secrets Manager multi-Region replication: https://docs.aws.amazon.com/secretsmanager/latest/userguide/replicate-secrets.html
- AWS Secrets Manager deletion and recovery windows: https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_delete-secret.html
- AWS Secrets Manager Python SDK retrieval guidance: https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets-python-sdk.html
- Boto3 Secrets Manager guide: https://docs.aws.amazon.com/boto3/latest/guide/secrets-manager.html
- Terraform AWS provider `aws_secretsmanager_secret`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- Terraform AWS provider `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Terraform AWS provider `aws_secretsmanager_secret_rotation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- Terraform Random provider `random_password`: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- AWS Systems Manager Parameter Store pricing: https://aws.amazon.com/systems-manager/pricing/

## Issues Found
- The state-file warning described plaintext secret storage as a fundamental limitation. This is accurate for `secret_string` and `random_password.result`, but current Terraform/AWS provider versions include write-only secret value arguments such as `secret_string_wo`. Updated the warning to be specific to `secret_string` and to mention `secret_string_wo` as an option when supported.
- The rotation section said AWS provides managed rotation Lambda functions for RDS credentials. AWS distinguishes managed rotation, which does not use Lambda for supported service-managed secrets, from Lambda rotation templates for database secrets. Updated the wording to distinguish RDS-managed rotation from rotation Lambda templates.
- The rotation Lambda IAM example did not mention KMS permissions for customer-managed KMS keys. Added a note that the Lambda execution role also needs permission to use the key when the secret is not encrypted with `aws/secretsmanager`.
- The cross-account resource policy section implied that a secret resource policy alone allows cross-account reads. AWS requires both a resource policy and an identity-based policy, plus customer-managed KMS key permissions if the secret is encrypted with KMS. Updated the text to explain those additional requirements and that `aws/secretsmanager` cannot be used for cross-account access.

## Review Notes
The Terraform snippets are illustrative and omit surrounding resources such as provider configuration, `data.aws_caller_identity.current`, the database instance, and the rotation Lambda implementation. The code blocks use current resource names and arguments, but a production rotation Lambda should also include logging/VPC/networking permissions and database-specific permissions as needed.
