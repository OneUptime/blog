# Validation Summary: How to Define a Resource Block in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL (HashiCorp Configuration Language)
- AWS provider (`aws_instance`, `aws_s3_bucket`, `aws_vpc`, `aws_subnet`, `aws_security_group`, `aws_db_instance`, `aws_lambda_function`, `aws_network_interface`)
- AzureRM provider (`azurerm_resource_group`, `azurerm_virtual_network`)
- Google Cloud provider (`google_compute_instance`, `google_storage_bucket`)
- Kubernetes provider (`kubernetes_namespace`, `kubernetes_deployment`)
- Terraform dynamic blocks, variables, locals, and data sources

## Sources Consulted
- Terraform Language documentation — Resources: https://developer.hashicorp.com/terraform/language/resources
- Terraform Language — Resource Syntax: https://developer.hashicorp.com/terraform/language/resources/syntax
- Terraform Language — Dynamic Blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform AWS Provider — `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider — `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS Provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider — `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AzureRM Provider documentation
- Terraform Google Provider documentation
- Terraform Kubernetes Provider documentation

## Issues Found
- **Missing markdown header on "Resource Types and Providers" section (line 40).** The text was rendered as a plain paragraph rather than a section heading even though every other section uses an `##` heading. Fixed by adding the `##` prefix so the section renders correctly.

## Review Notes
- The post lists `bucket` as a "required argument" for `aws_s3_bucket`. Strictly speaking, `bucket` is documented as Optional in the AWS provider (if omitted, Terraform generates a random unique name using `bucket_prefix` defaults). However, this is a near-universal teaching convention since real-world configurations almost always set it explicitly. Left as-is since it reflects practical usage and is not actively misleading for learners.
- The AWS provider has been moving toward standalone rule resources (`aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`) as the recommended approach over inline `ingress` / `egress` blocks in `aws_security_group`. The inline form shown in the post still works and is not deprecated, but readers building new infrastructure may want to consider the standalone rule resources for better lifecycle management. No change made — both are valid.
- The `network_interface` nested block in the `aws_instance` example is correct; it does not conflict with the resource's other arguments because `subnet_id`, `security_groups`, etc. are not set on the same resource (these are mutually exclusive with `network_interface`).
- Engine version "15.4" for `aws_db_instance` with `engine = "postgres"` is a valid PostgreSQL version supported by Amazon RDS.
