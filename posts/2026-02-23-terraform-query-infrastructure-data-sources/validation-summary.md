# Validation Summary: How to Query Existing Infrastructure with Data Sources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform data sources
- HashiCorp AWS provider
- AWS VPC, subnets, AMIs, IAM, ACM, EC2, ECS, Secrets Manager, RDS, and Route 53

## Sources Consulted
- Terraform data sources language documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform data sources tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/data-sources
- Terraform AWS provider `aws_vpc` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- Terraform AWS provider `aws_subnet` and `aws_subnets` data sources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform AWS provider `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider `aws_acm_certificate` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate
- Terraform AWS provider `aws_security_group` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_group
- Terraform AWS provider `aws_secretsmanager_secret` and `aws_secretsmanager_secret_version` data sources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- Terraform AWS provider `aws_route53_zone` data source and `aws_route53_record` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- OneUptime linked posts were checked and resolve successfully: https://oneuptime.com/blog/post/2026-02-23-terraform-http-data-source/view, https://oneuptime.com/blog/post/2026-02-23-terraform-external-data-source/view, and https://oneuptime.com/blog/post/2026-02-23-terraform-dynamic-ami-lookup/view

## Issues Found
- The post stated that all VPC attributes become available through `data.aws_vpc.main.*`. Reworded this to use a concrete attribute reference, because Terraform data source attributes are referenced with names such as `data.aws_vpc.main.id`.
- The ACM example comment said "Look up by ARN" while the code used the `domain` argument. Changed the comment to "Look up by domain" to match the AWS provider data source.
- The RDS example omitted `allocated_storage`, which is required for `aws_db_instance` unless using a snapshot or replica source. Added `allocated_storage = 20`.
- The plan phase section said data source queries run during `terraform plan`, not during apply. Terraform attempts data source reads during planning but can defer reads to apply when query arguments are unknown during planning. Updated the explanation and bullets to reflect this.
- The optional security group example comment implied Terraform could use an existing security group if found and otherwise create one. A failed data source lookup still fails; the conditional only skips the lookup when no name is provided. Updated the comment to describe the actual behavior.

## Review Notes
- The examples are illustrative and still assume surrounding provider configuration, variables, and referenced resources such as `var.instance_type`, `aws_ecs_cluster.main`, `aws_eip.app`, and `var.vpc_id` exist.
- `terraform` was not installed in the review environment, so validation was performed against official documentation rather than by running `terraform fmt` or `terraform validate`.
- The Secrets Manager example is technically valid, but database credentials referenced by Terraform resources can be stored in Terraform state. A future security-focused edit could mention state protection.
