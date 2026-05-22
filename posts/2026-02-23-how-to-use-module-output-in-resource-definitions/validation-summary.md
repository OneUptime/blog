# Validation Summary: How to Use Module Output in Resource Definitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform modules and output values
- Terraform expressions, dynamic blocks, `count`, and `for_each`
- AWS provider resources and data sources
- AWS EC2, VPC, ALB, ECS, IAM, SSM Parameter Store, Route Tables, and CloudWatch

## Sources Consulted
- HashiCorp Terraform documentation: Use outputs to expose module data - https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform documentation: References to named values and dependencies - https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform documentation: Dynamic blocks - https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform documentation: `for_each` meta-argument - https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform AWS provider documentation: `aws_autoscaling_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- HashiCorp Terraform AWS provider documentation: `aws_iam_policy_document` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS Systems Manager documentation: Parameter Store SecureString parameters - https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html

## Issues Found
- The first example in "Indexing into List and Map Outputs" was labeled as accessing a specific list element, but it showed a Route 53 alias record using scalar ALB outputs and did not index into a list. The post now uses an `aws_route_table_association` example with `module.vpc.private_subnet_ids[0]`, matching the surrounding explanation and Terraform's documented list indexing syntax.

## Review Notes
The remaining Terraform claims about `module.<CHILD_MODULE_NAME>.<OUTPUT_NAME>`, implicit dependencies from references, dynamic block iteration, and `for_each` limitations for values known only after apply are consistent with HashiCorp's current documentation. The snippets are illustrative and depend on the referenced local modules exposing the named outputs.
