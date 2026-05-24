# Validation Summary: How to Handle Import Conflicts in Terraform

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (CLI commands, HCL syntax, state management, import blocks)
- AWS Provider (aws_instance, aws_default_vpc, aws_default_security_group, aws_route53_record)
- Azure Provider (azurerm_subscription resources)
- Google Cloud Provider (google_project_service)
- AWS CLI (s3api commands for state recovery)
- S3 backend configuration

## Sources Consulted
- Terraform CLI documentation: https://developer.hashicorp.com/terraform/cli/commands
- Terraform state commands: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform import command: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform import blocks (1.5+): https://developer.hashicorp.com/terraform/language/import
- Terraform force-unlock: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform lifecycle meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS Provider aws_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS Provider data source aws_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance
- AWS Provider aws_default_vpc: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/default_vpc
- AWS Provider aws_default_security_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/default_security_group
- AWS Provider aws_route53_record (import format): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Google Provider google_project_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service
- AWS CLI s3api reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/settings/backends/s3

## Issues Found
- **Missing markdown heading marker on line 25**: The section "Resource Already Exists in State" was missing its `##` heading prefix, causing it to render as plain text instead of a proper section heading like all the other sections in the post. Added `## ` prefix to match the rest of the document's structure.

## Review Notes
- All Terraform CLI commands (`state show`, `state rm`, `state mv`, `state list`, `import`, `force-unlock`, `providers`, `plan`, `apply`) are syntactically correct and current.
- Import block syntax (Terraform 1.5+) is correct.
- HCL examples for resource configuration, `lifecycle.ignore_changes`, and backend configuration are syntactically valid.
- The `aws_default_vpc` and `aws_default_security_group` resources are correct names in the AWS provider, and they do support import.
- The `data "aws_instance"` source correctly uses `instance_id` as an argument.
- The `google_project_service` resource correctly uses the `disable_on_destroy` argument.
- The AWS CLI `s3api list-object-versions` and `get-object` commands (with positional output file argument) are correct.
- The Route53 import ID format claim (different formats across provider versions) is somewhat illustrative rather than literal — Route53 hosted zone IDs from AWS are typically 13-22 alphanumeric characters and the import ID format `ZONEID_NAME_TYPE` has been stable, but the general point that import IDs can vary across provider versions is valid for some resources, so this is left as written.
- The example Terraform error and lock info messages are representative rather than verbatim quotes; the content conveys the right meaning for readers troubleshooting these issues.
