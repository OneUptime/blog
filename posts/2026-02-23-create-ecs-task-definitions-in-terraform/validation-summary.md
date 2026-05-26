# Validation Summary: How to Create ECS Task Definitions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon ECS task definitions
- AWS Fargate
- Amazon CloudWatch Logs
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- Amazon EFS
- AWS IAM

## Sources Consulted
- Terraform AWS Provider `aws_ecs_task_definition` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS task definition differences for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Pass Secrets Manager secrets through Amazon ECS environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Pass Systems Manager parameters through Amazon ECS environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Use Amazon EFS volumes with Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html

## Issues Found
- The Fargate CPU and memory table omitted current 8 vCPU and 16 vCPU task sizes. Added the valid memory ranges and increments for `8192` and `16384` CPU units.
- The Datadog sidecar example defined `DD_API_KEY` as both a blank plain environment variable and a secret. Removed the blank environment variable so the value is provided only through the `secrets` block.
- The Secrets Manager ARN explanation used an incomplete ARN format and the sample ARNs used a non-12-digit account ID. Updated the format and examples to match Amazon ECS Secrets Manager syntax.
- The EFS example used `root_directory = "/data"` while also specifying an EFS access point. ECS requires the root directory to be omitted or set to `/` when an access point is used. Updated it to `/`.

## Review Notes
The examples assume the referenced IAM roles, ECR repository, variables, KMS key ARN, and supporting ECS service/networking resources are defined elsewhere. For Secrets Manager JSON key injection and EFS on Fargate, platform version requirements may apply; the snippets are correct for supported current Fargate platform versions.
