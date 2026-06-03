# Validation Summary: How to Create Secrets Manager Secrets with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Secrets Manager
- AWS Key Management Service (KMS)
- AWS Lambda
- AWS Identity and Access Management (IAM)
- Terraform
- HashiCorp AWS provider
- HashiCorp Random provider

## Sources Consulted
- HashiCorp AWS provider documentation: `aws_secretsmanager_secret` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret.html.markdown
- HashiCorp AWS provider documentation: `aws_secretsmanager_secret_version` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret_version.html.markdown
- HashiCorp AWS provider documentation: `aws_secretsmanager_secret_policy` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret_policy.html.markdown
- HashiCorp AWS provider documentation: `aws_secretsmanager_secret_rotation` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- HashiCorp AWS provider documentation: `aws_secretsmanager_secret_version` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret_version.html.markdown
- HashiCorp Random provider documentation: `random_password` - https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- HashiCorp Terraform documentation: sensitive variables and state - https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- AWS Secrets Manager documentation: secret encryption and KMS keys - https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- AWS Secrets Manager documentation: rotation function templates - https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_available-rotation-templates.html
- AWS Secrets Manager documentation: automatic rotation for database secrets - https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_turn-on-for-db.html
- AWS Secrets Manager documentation: cross-account access - https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples_cross.html
- AWS Secrets Manager API Reference: `GetSecretValue` - https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html

## Issues Found
- The introduction implied that secrets rotate automatically as an inherent behavior. Updated it to say secrets can rotate automatically, because rotation must be configured.
- The JSON secrets section said most AWS SDKs have built-in support for parsing structured secrets. Updated it to say SDKs retrieve the secret string and the application parses JSON, matching the `GetSecretValue` behavior.
- The rotation section described AWS-provided database rotation functions as built-in/managed functions. Updated this to rotation Lambda templates, which is how AWS documents them.
- The custom rotation Lambda IAM policy targeted the RDS password secret while the section discusses non-database secrets such as API keys. Updated the example policy resource to `aws_secretsmanager_secret.api_key.arn`.
- The cross-account resource policy section implied the resource policy alone allows retrieval. Added the required caller-side identity policy caveat and noted customer-managed KMS key permissions for encrypted cross-account access.

## Review Notes
The Terraform snippets use current resource names and arguments. Secret values passed through `aws_secretsmanager_secret_version.secret_string`, data sources, and `random_password` remain sensitive state concerns; the post correctly warns readers to secure Terraform state.
