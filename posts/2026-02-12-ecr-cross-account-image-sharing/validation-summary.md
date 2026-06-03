# Validation Summary: How to Set Up ECR Cross-Account Image Sharing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Elastic Container Registry (Amazon ECR)
- Amazon Elastic Container Service (Amazon ECS)
- AWS Identity and Access Management (IAM)
- AWS Organizations policy condition keys
- AWS CLI
- Terraform AWS provider
- Docker CLI

## Sources Consulted
- Amazon ECR private repository policies: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- Amazon ECR private repository policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- Amazon ECR private image replication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html
- Amazon ECR registry permissions for cross-account replication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry-permissions-create-replication.html
- Amazon ECR image scanning: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR with Amazon ECS: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_ECS.html
- Amazon ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS CLI `ecr set-repository-policy`: https://docs.aws.amazon.com/cli/latest/reference/ecr/set-repository-policy.html
- AWS CLI `ecr put-registry-policy`: https://docs.aws.amazon.com/cli/latest/reference/ecr/put-registry-policy.html
- AWS CLI `ecr get-login-password`: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Terraform AWS provider `aws_ecr_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform AWS provider `aws_ecr_repository_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository_policy
- Terraform AWS provider `aws_ecr_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_replication_configuration
- Terraform AWS provider `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition

## Issues Found
- The security best practice for image scanning said to scan images in the source account "before they're available to deployment accounts." ECR scan-on-push runs after an image is pushed and does not automatically block pulls or deployments. Updated the wording to say deployments should be gated on scan results before deployment accounts use the image.

## Review Notes
The repository policies, IAM permissions, ECS task definition image URI, AWS CLI commands, and ECR replication examples match current AWS and Terraform provider documentation. The local AWS CLI and Terraform binaries were not installed in the review environment, so command verification was performed against official documentation rather than local `--help` output.
