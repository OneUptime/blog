# Validation Summary: How to Use Ephemeral Resources for Temporary Credentials in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider
- Vault Provider
- GitHub Provider
- PostgreSQL `psql`

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu ephemeral resources docs: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu write-only attributes docs: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- AWS provider docs source for `aws_secretsmanager_secret_version` ephemeral resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/ephemeral-resources/secretsmanager_secret_version.html.markdown
- AWS provider docs source for `aws_ssm_parameter` ephemeral resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/ephemeral-resources/ssm_parameter.html.markdown
- AWS provider docs source for `aws_db_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- Vault provider guide for ephemeral resources: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/guides/using_ephemeral_resources.html.markdown
- Vault provider docs source for `vault_database_secret`: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/database_secret.html.md
- Vault provider docs source for `vault_aws_access_credentials`: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/aws_access_credentials.html.md
- GitHub provider docs source: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/index.html.markdown
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/current/app-psql.html

## Issues Found
- The original AWS STS example used `ephemeral "aws_iam_role"`, which is not a documented ephemeral resource in the AWS provider. I replaced it with the documented `vault_aws_access_credentials` ephemeral resource, which can issue STS credentials and feed them into the AWS provider.
- The RDS example used `password`, but `password` is not a write-only attribute and would be stored in state. I changed it to `password_wo` and added `password_wo_version`, which is the documented write-only pattern for this resource.
- The RDS snippet also omitted required configuration for a normal PostgreSQL instance and hard-coded a specific engine patch version. I added `allocated_storage`, added `db_name` to match the later migration example, and removed the unnecessary patch-specific `engine_version`.
- The `psql ${aws_db_instance.main.endpoint}/app` command did not match documented `psql` connection syntax. I replaced it with `psql -h ... -p ... -d app`, which uses the documented host, port, and database options.
- The `aws_ssm_parameter` ephemeral resource example used `name`, but the documented ephemeral resource requires `arn`. I updated the example to use an SSM parameter ARN.

## Review Notes
- Ephemeral resources and write-only attributes require OpenTofu 1.11 or later.
- The STS example assumes a Vault AWS secrets engine role already exists and is authorized to issue STS credentials for the target AWS role.
- Several snippets still rely on surrounding configuration not shown in the post, such as provider declarations and referenced resources or variables, but their corrected resource types, arguments, and command syntax are now technically consistent with the official documentation.
