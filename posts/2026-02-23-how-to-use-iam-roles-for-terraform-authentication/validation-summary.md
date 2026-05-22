# Validation Summary: How to Use IAM Roles for Terraform Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- AWS IAM roles and instance profiles
- AWS STS AssumeRole
- Amazon EC2 instance metadata credentials
- Amazon ECS task roles and task execution roles
- AWS shared config profiles
- AWS CloudTrail session tags

## Sources Consulted
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider `aws_ecs_task_definition` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS STS `AssumeRole` API reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS IAM role assumption documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage-assume.html
- AWS IAM global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM session tags documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- AWS SDKs and tools standardized credential providers: https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html
- Amazon ECS task IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- Amazon ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS shared config and credentials files reference: https://docs.aws.amazon.com/sdkref/latest/guide/file-format.html

## Issues Found
- The ECS example described the task execution role as being used to pull images and write logs, but did not attach the standard `AmazonECSTaskExecutionRolePolicy`. Added an `aws_iam_role_policy_attachment` for `arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy`, matching AWS ECS task execution role guidance.
- The session tag example showed Terraform passing role session tags but did not mention AWS's requirement that the role trust policy allow `sts:TagSession`. Added a short note before the example so readers know the AssumeRole call can fail without that trust-policy permission.

## Review Notes
- Terraform was not installed in the local environment, so HCL snippets were reviewed against current Terraform AWS provider documentation rather than formatted or validated with the Terraform CLI.
- The fixed AMI ID used in examples is region-specific and may become stale; it is acceptable as illustrative sample code but should be replaced with a current AMI lookup in production-oriented examples.
