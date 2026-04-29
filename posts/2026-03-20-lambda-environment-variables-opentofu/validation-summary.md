# Validation Summary: How to Configure Lambda Environment Variables with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS Lambda
- AWS KMS
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Python
- HCL / Terraform-compatible AWS provider configuration

## Sources Consulted
- AWS Lambda environment variables: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Lambda environment variable encryption: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda with Secrets Manager: https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- AWS Secrets Manager `GetSecretValue` API: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
- AWS Secrets Manager encryption and KMS permissions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- AWS Systems Manager Parameter Store overview: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- AWS Parameters and Secrets Lambda extension: https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
- OpenTofu `init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu sensitive data in state: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu 1.6 documentation overview: https://opentofu.org/docs/v1.6/
- AWS provider `aws_lambda_function` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown
- AWS provider `aws_secretsmanager_secret` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret.html.markdown
- AWS provider `aws_secretsmanager_secret_version` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret_version.html.markdown
- AWS provider `aws_iam_role_policy` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role_policy.html.markdown

## Issues Found
- The Step 2 comments said Lambda fetches the secret and SSM parameter values automatically at runtime. AWS Lambda environment variable docs state that environment variable values are exposed to the function as literal strings, so secret and parameter retrieval must be done by function code or a Lambda extension. I corrected the comments to attribute runtime retrieval to the function code.
- The conclusion said secrets in Lambda environment variables are visible in the AWS console and logs. AWS docs support console/configuration visibility for authorized users, but they do not say Lambda automatically writes environment variable values to logs. I corrected the statement to reflect console access accurately.
- The Secrets Manager example stored secret material via `secret_string` without noting that OpenTofu state contains resource attributes and can therefore contain sensitive values. I added a note telling readers to protect the state backend and state access.

## Review Notes
- `tofu` is not installed in this workspace, so `tofu init`, `tofu plan`, and `tofu apply` were validated against the official OpenTofu CLI documentation rather than local `--help` output.
- The AWS provider documentation still supports `source_code_hash` for `aws_lambda_function`, so that part of the snippet remains valid.
- OpenTofu 1.6 is still within the article's stated compatibility range, but the official 1.6 documentation is no longer actively maintained; current docs are published under later versions.
