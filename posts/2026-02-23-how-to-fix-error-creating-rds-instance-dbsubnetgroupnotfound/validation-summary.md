# Validation Summary: How to Fix Error Creating RDS Instance DBSubnetGroupNotFound

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HashiCorp)
- AWS RDS (Relational Database Service)
- AWS VPC (Virtual Private Cloud) and Subnets
- AWS Security Groups
- AWS CLI
- MySQL (as example RDS engine)
- Terraform AWS Provider resources: `aws_db_subnet_group`, `aws_db_instance`, `aws_vpc`, `aws_subnet`, `aws_security_group`
- Terraform AWS Provider data source: `aws_subnets`

## Sources Consulted
- AWS RDS API Reference — DBSubnetGroupNotFoundFault: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/CommonErrors.html
- AWS RDS User Guide — Working with DB Subnet Groups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- Terraform AWS Provider `aws_db_subnet_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS Provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_subnets` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform CLI documentation — `terraform state rm` and `terraform refresh`: https://developer.hashicorp.com/terraform/cli/commands
- AWS CLI Reference — `aws rds describe-db-subnet-groups`: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-subnet-groups.html

## Issues Found
No technical issues found.

All code examples, AWS CLI commands, Terraform resource/data-source names and attributes, and conceptual explanations match the official documentation. The DB subnet group requirement of at least two Availability Zones, the regional nature of subnet groups, and the implicit dependency mechanism via resource references are all accurately described.

## Review Notes
- `terraform refresh` is still functional but has been soft-deprecated since Terraform 0.15 in favor of `terraform apply -refresh-only`. The post mentions `terraform refresh` which still works, so it is not incorrect, but readers on newer Terraform versions (1.0+) may prefer the refresh-only mode for safer state synchronization.
- The MySQL `engine_version = "8.0"` is acceptable but RDS supports more specific versions (e.g., `8.0.35`). Using a major version family is generally fine since RDS will pick a current minor version.
- The example uses `username = "admin"` for RDS MySQL — while valid, AWS reserves several usernames; `admin` is allowed but `rdsadmin` is not. This is correct as written.
- The `aws_subnets` data source example correctly uses the non-deprecated replacement for the older `aws_subnet_ids` data source.
