# Validation Summary: How to Use terraform.workspace Reference in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform HCL expressions and named values
- Terraform local values, outputs, preconditions, and functions
- Terraform S3 backend workspace state paths
- AWS provider resources and provider configuration

## Sources Consulted
- HashiCorp Terraform documentation: References to Named Values - https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform documentation: Manage Workspaces - https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp Terraform CLI command reference: workspace select - https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- HashiCorp Terraform documentation: S3 backend - https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform documentation: Output block reference and preconditions - https://developer.hashicorp.com/terraform/language/block/output
- HashiCorp Terraform documentation: Validate your infrastructure in Terraform's configuration language - https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- HashiCorp Terraform documentation: contains function - https://developer.hashicorp.com/terraform/language/functions/contains
- HashiCorp Terraform Registry: AWS provider aws_cloudwatch_metric_alarm resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The workspace validation snippet used a `locals`-only assertion with `tobool("ERROR: ...")`. Local values are only useful when referenced, so the snippet did not reliably support the claim that it would cause an error during plan. Replaced it with an `output` block precondition, which Terraform documents as a plan/apply-blocking validation mechanism with an `error_message`.

## Review Notes
- Terraform CLI was not installed in this environment, so local `terraform validate` execution was not possible.
- The S3 backend workspace path example is correct for the default `workspace_key_prefix` value of `env:`.
