# Validation Summary: How to Create Terraform Modules for CI/CD Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS ECR (Elastic Container Registry)
- AWS CodeBuild
- AWS CodePipeline
- AWS CodeStar Connections
- AWS IAM
- AWS S3
- AWS CloudWatch Logs
- AWS ECS (deployment target)

## Sources Consulted
- Terraform AWS Provider docs — `aws_ecr_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform AWS Provider docs — `aws_ecr_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- Terraform AWS Provider docs — `aws_codebuild_project`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project
- Terraform AWS Provider docs — `aws_codepipeline`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codepipeline
- Terraform AWS Provider docs — `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS ECR lifecycle policy syntax: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- AWS CodeBuild environment images: https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html
- AWS CodePipeline action structure reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference.html
- AWS CodePipeline ECS deploy action: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-ECS.html
- Terraform `dynamic` blocks reference: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks

## Issues Found
1. **Missing `project_name` output on the CodeBuild module.** The composition example at the end of the post references `module.codebuild.project_name`, but the `modules/codebuild/main.tf` snippet did not declare any outputs, so the example would fail with `This object does not have an attribute named "project_name"`. **Fix:** Added `project_name`, `project_arn`, and `role_arn` outputs to the CodeBuild module so the composition example actually resolves.

## Review Notes
- ECR lifecycle policy JSON syntax is valid: `tagStatus: "untagged"` with `countType: "sinceImagePushed"` + `countUnit: "days"` is correct; the tagged rule uses `tagPrefixList` (required when `tagStatus = "tagged"` and `countType = "imageCountMoreThan"`) — both are valid per AWS docs.
- `aws/codebuild/amazonlinux2-x86_64-standard:5.0` is a valid current AWS-managed CodeBuild image. (Newer Amazon Linux 2023 images are also available but the AL2 5.0 image remains supported.)
- The CodePipeline `IAM` role created in the pipeline module has only a trust policy and no inline permissions policy — in a real environment this role still needs at minimum S3 (artifact bucket), CodeBuild (StartBuild), CodeStar Connections (UseConnection), ECS deploy, and KMS permissions. The post does not call this out; readers should not copy the pipeline module as-is to production without attaching a role policy.
- The S3 artifact bucket uses `sse_algorithm = "aws:kms"` without a `kms_master_key_id`, which falls back to the AWS-managed `aws/s3` KMS key. This is valid Terraform but the CodePipeline role would need `kms:Decrypt`/`kms:GenerateDataKey` permissions on that key — another argument that the missing pipeline IAM policy is the most important real-world caveat.
- The composition example references `data.aws_caller_identity.current.account_id` and `module.compute.*` without showing their declarations; this is acceptable shorthand for a blog post but worth noting for readers copying the snippet.
- `privileged_mode = true` is correctly required for building Docker images inside CodeBuild and is appropriately commented.
- The `optional()` modifier in the `environment_variables` variable type requires Terraform 1.3+. This is current and reasonable but not explicitly stated in the post.
