# Validation Summary: How to Add Variable Descriptions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variables
- HCL
- Terraform type constraints
- Terraform sensitive variables
- terraform-docs
- AWS RDS and VPC examples

## Sources Consulted
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Terraform strings and heredoc documentation: https://developer.hashicorp.com/terraform/language/expressions/strings#heredoc-strings
- terraform-docs markdown table reference: https://terraform-docs.io/reference/markdown-table/
- AWS RDS backup retention documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html
- AWS NAT Gateway pricing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html

## Issues Found
- The "Where Descriptions Appear" list said descriptions appear in `terraform plan` "in some contexts when values are being resolved." Terraform's documented behavior is that unset required root module variables can prompt before planning, and those prompts include variable documentation. I changed this item to say Terraform CLI commands show descriptions when `plan` or `apply` prompts for required input variables.

## Review Notes
- `optional(number, 300)` and `optional(number, 60)` are valid current Terraform object type constraint syntax. This requires Terraform versions that support optional object attributes with defaults, which are stable in current Terraform.
- Terraform and terraform-docs were not installed in the local environment, so command behavior was verified against official documentation rather than local CLI execution.
- The two internal OneUptime links returned HTTP 200 responses.
