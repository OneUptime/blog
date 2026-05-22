# Validation Summary: How to Use the nonsensitive Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform functions
- Terraform sensitive values
- Terraform output blocks
- AWS Terraform provider
- HashiCorp Random provider

## Sources Consulted
- Terraform `nonsensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- Terraform `sensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/sensitive
- Terraform sensitive data management documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Random provider `random_password` resource documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- HashiCorp AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider `aws_secretsmanager_secret_version` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version

## Issues Found
- The "Working with Resource Attributes" example claimed that `aws_db_instance.main.endpoint` and `aws_db_instance.main.port` might become sensitive because the resource uses a sensitive password. The AWS provider documents endpoint address and port as normal exported endpoint attributes, and `nonsensitive` would be inappropriate if those values are not marked sensitive. Replaced the example with `random_password.database.result`, whose `result` attribute is documented as sensitive, and showed deriving a non-secret length from it.
- The generic error-handling snippet used `some_value` as a bare Terraform symbol. Updated it to `var.some_value` so the expression uses valid Terraform reference syntax.

## Review Notes
Terraform was not installed in the local environment, so validation was performed against official HashiCorp documentation and Terraform Registry provider documentation. The post does not mention Terraform version requirements; the official documentation notes that `nonsensitive` and `sensitive` are available in Terraform v0.15 and later.
