# Validation Summary: How to Reference Input Variables in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform expressions
- Terraform modules
- AWS provider resource examples

## Sources Consulted
- HashiCorp Terraform documentation: Input variables - https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform documentation: Variable block reference - https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform documentation: References to named values - https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform documentation: Types and values - https://developer.hashicorp.com/terraform/language/expressions/types
- HashiCorp Terraform documentation: Strings and templates - https://developer.hashicorp.com/terraform/language/expressions/strings
- HashiCorp Terraform documentation: For expressions - https://developer.hashicorp.com/terraform/language/expressions/for
- HashiCorp Terraform documentation: Conditional expressions - https://developer.hashicorp.com/terraform/language/expressions/conditionals
- HashiCorp Terraform documentation: Backend block configuration - https://developer.hashicorp.com/terraform/language/settings/backends/configuration
- HashiCorp Terraform documentation: Provider requirements - https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform Registry: AWS provider aws_db_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The "Referencing Variables in Resource Arguments" example used `var.instance_type` without declaring an `instance_type` variable in that snippet. Added a matching `variable "instance_type"` block so the example is internally consistent.
- The string interpolation example used `var.db_password` without declaring a `db_password` variable. Added a sensitive string variable declaration, matching Terraform's documented pattern for password variables.
- The "Variables You Cannot Reference" list said `var` references are not allowed inside `variable` blocks themselves. This was too broad because Terraform variable validation blocks can reference variables. Changed the wording to state that `var` references are not allowed in variable default values, which matches the Terraform variable block reference.

## Review Notes
- Terraform CLI was not installed in the local environment, so syntax was reviewed against official HashiCorp documentation rather than by running `terraform validate`.
- The AWS examples use static AMI IDs for illustration. In real configurations, AMI IDs are region-specific and commonly selected with a data source.
