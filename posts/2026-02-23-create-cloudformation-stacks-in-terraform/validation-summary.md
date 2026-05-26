# Validation Summary: How to Create CloudFormation Stacks in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS CloudFormation stacks
- AWS CloudFormation StackSets
- AWS Organizations
- Amazon S3
- Amazon SNS
- Amazon ECS
- AWS Systems Manager Parameter Store

## Sources Consulted
- Terraform Registry: `aws_cloudformation_stack` resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack
- Terraform Registry: `aws_cloudformation_stack_set` resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack_set
- Terraform Registry: `aws_cloudformation_stack_set_instance` resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack_set_instance
- Terraform Registry: `aws_ecs_task_definition` resource, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- HashiCorp Developer: provider requirements, https://developer.hashicorp.com/terraform/language/providers/requirements
- AWS CloudFormation API Reference: `CreateStack`, https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_CreateStack.html
- AWS CloudFormation User Guide: StackSets with service-managed permissions, https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-associate-stackset-with-org.html
- AWS CloudFormation Template Reference: `AWS::CloudFormation::StackSet`, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudformation-stackset.html
- AWS CloudFormation User Guide: stack policies, https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html

## Issues Found
- The provider version was pinned to AWS provider `~> 5.0`, while current official examples use AWS provider `~> 6.0`. Updated the provider constraint to `~> 6.0`.
- The external template example described `on_failure = "ROLLBACK"` as preventing accidental deletion. In CloudFormation, `OnFailure` controls what happens if stack creation fails. Updated the comment to say it rolls back the stack if creation fails.
- The StackSet example mixed self-managed administration role setup with `permission_model = "SERVICE_MANAGED"`. AWS documentation states that service-managed StackSets use AWS Organizations trusted access and CloudFormation-created roles, while self-managed StackSets require administrator and execution roles. Removed the self-managed role resources and added a trusted-access note.
- The StackSet template used a CloudTrail trail with a hard-coded S3 bucket name and no bucket policy, which would not reliably create successfully. Replaced it with an S3 audit bucket using server-side encryption and public access blocking.
- The StackSet instance example used `region`, which is deprecated in the current AWS provider. Updated it to `stack_set_instance_region`.
- Removed unnecessary `CAPABILITY_IAM` from the revised StackSet example because the revised template no longer creates IAM resources.

## Review Notes
Terraform was not installed in the local workspace, so I could not run `terraform validate`. The examples were reviewed against official Terraform Registry and AWS documentation instead. Some snippets still depend on external files or resources not shown in the post, such as referenced template files, S3 buckets, and CloudFormation parameters.
