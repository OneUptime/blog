# Validation Summary: How to Handle Resource Attribute Changes in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform CLI
- Terraform lifecycle meta-arguments
- HashiCorp AWS provider
- AWS EC2
- AWS Auto Scaling
- AWS RDS
- Amazon S3

## Sources Consulted
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- Terraform sensitive variables tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Terraform drift management tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-drift
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The `security_groups` example used a security group ID (`sg-0abc123`) and described the attribute as deprecated in favor of `vpc_security_group_ids`. Current AWS provider documentation describes `security_groups` as security group names for EC2-Classic/default VPC, while VPC instances should use `vpc_security_group_ids`. Updated the section title, example, and comments accordingly.
- The sensitive RDS password section correctly stated that Terraform redacts sensitive values in plan output, but it omitted the AWS provider's state-file caveat. Added a short note that `password` is still stored in Terraform state and state backend access should be protected.

## Review Notes
The post's examples are illustrative and omit full provider configuration, variables, and required surrounding resources, which is acceptable for the scope. `aws_launch_configuration` remains supported in the AWS provider example, though AWS generally recommends launch templates for newer Auto Scaling configurations.
