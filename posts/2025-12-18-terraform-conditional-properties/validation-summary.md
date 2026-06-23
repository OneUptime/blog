# Validation Summary: How to Conditionally Use Properties in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform conditional expressions
- Terraform dynamic blocks
- Terraform `count` and `for_each`
- Terraform `coalesce` and `try` functions
- AWS provider resources for RDS, EC2 Launch Templates, IAM, S3, Security Groups, NAT Gateways, and Elastic IPs

## Sources Consulted
- HashiCorp Terraform conditional expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- HashiCorp Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform `coalesce` function documentation: https://developer.hashicorp.com/terraform/language/functions/coalesce
- HashiCorp Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- HashiCorp Terraform 0.12 null value announcement: https://www.hashicorp.com/en/blog/terraform-0-12-conditional-operator-improvements
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_s3_bucket_logging` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_logging
- Terraform AWS provider `aws_nat_gateway` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS provider `aws_eip` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip

## Issues Found
- The mechanisms list used "Null coalescing", which could imply a Terraform null-coalescing operator. Terraform documents the `coalesce` function instead, so this was changed to "Coalesce functions."
- The RDS KMS key example implied a default encryption key would be used when `kms_key_id` is null, but `aws_db_instance` storage encryption is disabled by default unless `storage_encrypted = true` is set. Added `storage_encrypted = true`, plus minimal required RDS arguments for the standalone example.
- The Enhanced Monitoring example created the IAM role but did not attach the AWS managed policy that grants RDS permission to publish enhanced monitoring metrics. Added an `aws_iam_role_policy_attachment` for `AmazonRDSEnhancedMonitoringRole`.
- The `coalesce` example referenced `var.custom_ami_id` without declaring it in the snippet. Added a matching variable declaration.

## Review Notes
- The security group example uses inline `ingress` and `egress` rules. This remains technically valid, but the current AWS provider documentation recommends using separate security group rule resources for many real-world configurations to avoid rule management conflicts.
- Several snippets are illustrative and depend on surrounding variables, data sources, or omitted resource configuration. The reviewed conditional logic, Terraform syntax, and provider argument names are accurate after the fixes above.
