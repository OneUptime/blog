# Validation Summary: How to Handle Terraform for Brownfield Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform import blocks
- Terraform lifecycle meta-arguments
- Terraform AWS provider
- AWS EC2
- AWS CloudFormation
- Boto3 for Python
- Terraformer

## Sources Consulted
- HashiCorp Terraform CLI import documentation: https://developer.hashicorp.com/terraform/cli/import
- HashiCorp Terraform import configuration generation documentation: https://developer.hashicorp.com/terraform/language/import/generating-configuration
- HashiCorp Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform resource syntax documentation: https://developer.hashicorp.com/terraform/language/resources/syntax
- Terraform AWS provider aws_instance documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider aws_cloudformation_stack data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudformation_stack
- Boto3 EC2 describe_instances documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_instances.html
- Terraformer project documentation: https://github.com/GoogleCloudPlatform/terraformer

## Issues Found
- The Boto3 EC2 inventory example used a single unpaginated `describe_instances()` call. AWS recommends paginated requests because unpaginated requests are susceptible to throttling and timeouts. Changed the example to use `ec2.get_paginator("describe_instances")`.
- The import verification script said a no-change targeted plan meant the configuration matched the existing resource. With `ignore_changes = all`, Terraform suppresses update proposals for all attributes, so that message could be misleading. Changed the success and warning messages to describe planned changes rather than full configuration equivalence.
- The configuration drift example included two `aws_instance.legacy` resource blocks in one HCL snippet. Split the phases into separate HCL snippets so each example is valid on its own.
- The CloudFormation coexistence example showed an `aws_instance` resource without the required EC2 launch arguments. Added representative `ami` and `instance_type` values so the resource example is complete.
- The `terraform plan -generate-config-out=generated.tf` example did not mention that the output path must be new. Added a comment noting that Terraform errors if the target file already exists.
- The best-practices section said a plan should show no changes if the configuration matches the existing resource. Clarified that this is only meaningful for managed attributes, and that `ignore_changes = all` must be removed or narrowed before using the plan to prove full configuration equivalence.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. The third-party generation tools listed in the post can be useful starting points, but generated configuration should still be reviewed and tested because provider schemas and generated output can change over time.
