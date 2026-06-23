# Validation Summary: How to Avoid Writing Secrets in Terraform State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform state and sensitive values
- Terraform AWS provider
- Terraform AzureRM provider
- Terraform Vault provider
- Terraform external provider
- AWS RDS
- AWS Secrets Manager
- AWS S3 backend
- Azure Key Vault
- SOPS
- HashiCorp Vault

## Sources Consulted
- HashiCorp Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider `aws_secretsmanager_secret_version` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- HashiCorp AWS provider `aws_secretsmanager_secret_version` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- HashiCorp Random provider `random_password` documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- HashiCorp Vault provider `vault_generic_secret` data source documentation: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- HashiCorp AzureRM provider `azurerm_key_vault_secret` data source documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret
- HashiCorp External provider documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- AWS RDS password management with Secrets Manager documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- SOPS documentation: https://getsops.io/docs/

## Issues Found
- The post broadly stated that Terraform state is stored in plaintext JSON. HashiCorp documents this specifically for local state, while remote state protection depends on the configured backend. I clarified the statement to distinguish local state from remote backend protection.
- The external secret manager section implied that referencing Vault, AWS Secrets Manager, or Azure Key Vault avoids storing secrets in Terraform. Terraform data source values passed to managed resource arguments can still be stored in state, and the AzureRM Key Vault secret documentation explicitly warns that secret values are stored in raw state. I added warnings to the text and examples.
- The environment variable strategy implied that generating secrets outside Terraform avoids state exposure. Sensitive variables redact CLI output, but HashiCorp documents that sensitive values are still stored in state and plan files when assigned to regular resource arguments. I clarified that this protects source code and routine output, not state.
- The `random_password` with `ignore_changes` section incorrectly said generated passwords persist without being tracked in state after initial creation. The random provider stores generated values in Terraform state, and `ignore_changes` only affects future diffs for the selected resource argument. I corrected the explanation and added a state warning to the Secrets Manager version example.
- The S3 backend example used `dynamodb_table` for state locking. Current Terraform S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3-native lock files with `use_lockfile = true`. I replaced `dynamodb_table` with `use_lockfile`.
- The post-apply rotation section did not mention that the initial Terraform-generated password remains in state. I clarified that rotation replaces the active password outside Terraform, but does not remove the original generated value from existing state.
- The SOPS example used a `.tfvars` file with `--output-type json` through the external data source. SOPS supports explicit JSON input/output, and the Terraform external provider expects a JSON object of string values. I changed the example to use `secrets.json`, added `--input-type json`, and noted that returned values are stored in state when used in resource arguments.

## Review Notes
Terraform, SOPS, and AWS CLI were not installed in the local environment, so command and configuration behavior was checked against official documentation rather than local `--help` output. The post is now technically accurate, but future improvements could cover Terraform 1.10+ ephemeral values and Terraform 1.11+ write-only resource arguments for providers that support them.
