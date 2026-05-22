# Validation Summary: How to Migrate from CloudFormation to Terraform

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS CloudFormation
- Terraform
- AWS CLI
- Terraform AWS provider
- cf2tf
- Bash

## Sources Consulted
- Terraform import block reference: https://developer.hashicorp.com/terraform/language/block/import
- Terraform import resources overview: https://docs.hashicorp.com/terraform/language/import
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS CloudFormation `DeletionPolicy` attribute documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- AWS CLI `cloudformation update-stack` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/update-stack.html
- AWS CLI `cloudformation list-stacks` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-stacks.html
- cf2tf project README and CLI source: https://github.com/DontShaveTheYak/cf2tf

## Issues Found
- The post stated that deleting a CloudFormation stack deletes all resources. Updated this to say CloudFormation deletes most resources unless a `DeletionPolicy` or resource-specific default changes that behavior, matching CloudFormation's documented behavior.
- The post used Terraform import blocks without noting the Terraform version requirement. Updated the wording to specify Terraform 1.5 or later.
- The CloudFormation `update-stack` example did not mention required IAM capabilities. Added a note to include `CAPABILITY_IAM` or `CAPABILITY_NAMED_IAM` when the stack contains IAM resources.
- The cf2tf example wrote to an output directory and then tried to read `main.tf` from that directory. cf2tf writes generated files by block type when using `--output`; updated the example to redirect stdout to `main.tf`, and kept the output-directory form as a separate option.

## Review Notes
The migration flow is technically valid, but real migrations often require additional handling for nested stacks, stack parameters, transforms/macros, resources with provider-specific import IDs, and Terraform drift caused by attributes that CloudFormation or AWS defaults manage implicitly.
