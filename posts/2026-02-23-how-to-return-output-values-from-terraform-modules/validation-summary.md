# Validation Summary: How to Return Output Values from Terraform Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform modules
- Terraform output values
- Terraform CLI
- AWS provider resources

## Sources Consulted
- HashiCorp Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- HashiCorp Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform `terraform output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform files and configuration structure: https://developer.hashicorp.com/terraform/language/files
- HashiCorp AWS provider `aws_lb` resource documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb.html.markdown
- HashiCorp AWS provider `aws_db_instance` resource documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- HashiCorp AWS provider `aws_nat_gateway` resource documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/nat_gateway.html.markdown

## Issues Found
- The post stated that outputs are defined in a module's `outputs.tf` file. Terraform evaluates all `.tf` files in a module, so `outputs.tf` is a convention rather than a requirement. Changed the wording to "commonly defined."
- The post implied every output has a description. Terraform requires an output name and `value`, while `description` is optional. Added a short clarification while preserving the recommendation to use descriptions.
- The sensitive output section said sensitive values are prevented from showing in plan output and logs. Terraform's documented behavior is redaction in CLI output, with some access paths such as named output queries and JSON output still showing values. Changed this to "Terraform CLI output."
- The output precondition example used `aws_lb.this.status`, but `aws_lb` does not export a `status` attribute. Replaced the condition with a check that the documented `dns_name` attribute is non-empty.

## Review Notes
The examples are illustrative snippets and assume surrounding resources, variables, and provider configuration exist. Root output behavior, module output access syntax, `depends_on`, `sensitive`, `try()`, collection expressions, and `terraform output` usage were consistent with official documentation.
