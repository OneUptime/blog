# Validation Summary: How to Build a Secrets Management Infrastructure with OpenTofu

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- AWS Secrets Manager
- AWS Key Management Service (KMS)
- AWS Lambda rotation functions
- AWS Serverless Application Repository
- AWS Identity and Access Management (IAM)

## Sources Consulted
- AWS Secrets Manager: Secret encryption and KMS permissions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- AWS Secrets Manager: JSON structure for rotation function templates: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_secret_json_structure.html
- AWS Secrets Manager: Lambda rotation functions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html
- AWS Secrets Manager: Available rotation function templates: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_available-rotation-templates.html
- AWS Secrets Manager: Set up automatic rotation for database secrets: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_turn-on-for-db.html
- AWS Secrets Manager: Cross-account access: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples_cross.html
- AWS KMS: Grants: https://docs.aws.amazon.com/kms/latest/developerguide/grants.html
- AWS KMS: kms:ViaService condition key: https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html
- AWS Serverless Application Repository: Deploying applications: https://docs.aws.amazon.com/serverlessrepo/latest/devguide/serverlessrepo-how-to-consume.html
- AWS Security Blog: Centrally manage secrets with AWS Secrets Manager: https://aws.amazon.com/blogs/security/how-to-centrally-manage-secrets-with-aws-secrets-manager/
- HashiCorp AWS provider docs for Secrets Manager rotation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- HashiCorp AWS provider docs for Serverless Application Repository stacks: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/serverlessapplicationrepository_cloudformation_stack

## Issues Found
- The KMS key policy granted key use to the `secretsmanager.amazonaws.com` service principal directly. AWS documents that Secrets Manager uses KMS on behalf of the caller, so the key policy was changed to allow same-account principals through Secrets Manager with `kms:CallerAccount` and `kms:ViaService` conditions.
- The PostgreSQL secret JSON omitted the required `engine = "postgres"` field expected by the AWS-provided RDS PostgreSQL rotation template. Added `engine` and `dbInstanceIdentifier` to match AWS's documented database secret structure.
- The rotation Lambda example treated a Serverless Application Repository template name as if it were an S3 object for `aws_lambda_function`. Replaced it with `aws_serverlessapplicationrepository_cloudformation_stack` plus a Lambda data source for the deployed function.
- The rotation schedule could be created before the initial secret version existed. Added an explicit dependency on `aws_secretsmanager_secret_version.db`.
- The cross-account access example only attached a secret resource policy. AWS requires secret resource policy access, KMS key access, and an identity policy in the workload account, so the example now includes a KMS grant and workload-account role policy.

## Review Notes
The post is technically relevant and valid after the fixes. OpenTofu/Terraform was not installed in the local environment, so I could not run `tofu fmt` or `tofu validate`; the HCL was reviewed against provider and AWS service documentation. Future improvements could mention that `aws_secretsmanager_secret_version.secret_string` is stored in OpenTofu state and should be protected accordingly.
