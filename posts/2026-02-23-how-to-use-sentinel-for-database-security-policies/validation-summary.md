# Validation Summary: How to Use Sentinel for Database Security Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Sentinel
- Terraform and HCP Terraform policy enforcement
- Terraform `tfplan/v2` Sentinel import
- AWS RDS and Aurora Terraform resources
- Azure SQL Terraform resources
- Google Cloud SQL Terraform resources

## Sources Consulted
- HashiCorp Sentinel `append` function documentation: https://developer.hashicorp.com/sentinel/docs/functions/append
- HashiCorp Sentinel language boolean expression documentation: https://developer.hashicorp.com/sentinel/docs/language/boolexpr
- HashiCorp Sentinel test command documentation: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Sentinel testing documentation: https://developer.hashicorp.com/sentinel/docs/writing/testing
- HashiCorp Terraform `tfplan/v2` import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform Sentinel testing tutorial: https://developer.hashicorp.com/terraform/tutorials/policy/sentinel-testing
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_rds_cluster_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AzureRM provider `azurerm_mssql_server` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- Terraform Google provider `google_sql_database_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance

## Issues Found
- The Sentinel snippets were marked as `python` code fences. Changed them to `sentinel` so the examples are identified as the correct language.
- The Azure SQL policy checked `azuread_administrator` only for `null`. In Terraform plan data, an omitted nested block can be represented as an empty list, so the original policy could miss a missing administrator. Changed the check to default to `[]` and require `length(azuread_admin) is 0` to fail.
- The Cloud SQL policy used `require_ssl`, which is deprecated in the current Google provider in favor of `ssl_mode`. Changed the policy to require `ssl_mode` values that enforce encrypted client connections.
- The Cloud SQL public access check allowed `ipv4_enabled = true` when `private_network` was configured. That still leaves a public IPv4 address enabled, so the policy now requires `ipv4_enabled` to be `false`.
- The Cloud SQL policy did not fail when `settings` or `ip_configuration` was missing. Added violations for missing blocks so the stated security checks cannot be bypassed by omission.
- The testing section described mock data as a test case without showing the Sentinel test HCL file required under `test/<policy>/*.hcl`. Added a proper `mock "tfplan/v2"` test case with `test.rules.main = false`.

## Review Notes
The Sentinel CLI was not installed in the local environment, so I could not execute `sentinel test -verbose`. The command and test layout were validated against HashiCorp's official Sentinel documentation instead.
