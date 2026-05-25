# Validation Summary: How to Build a CI/CD Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS CodePipeline
- AWS CodeBuild
- Amazon ECR
- Amazon ECS
- Amazon S3
- AWS KMS
- AWS IAM
- Amazon SNS
- AWS CodeStar Notifications

## Sources Consulted
- Terraform AWS Provider: aws_s3_bucket_lifecycle_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider: aws_codebuild_project - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project
- Terraform AWS Provider: aws_codepipeline - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codepipeline
- Terraform AWS Provider: aws_ecr_lifecycle_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- Terraform AWS Provider: aws_codestarnotifications_notification_rule - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codestarnotifications_notification_rule
- AWS CodePipeline: CodeStarSourceConnection action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CodePipeline: Amazon ECS deploy action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-ECS.html
- AWS CodePipeline: image definitions file reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/file-reference.html
- AWS CodeBuild: build caching - https://docs.aws.amazon.com/codebuild/latest/userguide/build-caching.html
- AWS Developer Tools Console: configure Amazon SNS topics for notifications - https://docs.aws.amazon.com/dtconsole/latest/userguide/set-up-sns.html
- Amazon ECR: lifecycle policy properties - https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html

## Issues Found
- The S3 lifecycle configuration omitted an explicit lifecycle rule filter. The latest Terraform AWS Provider still allows the legacy implicit empty-prefix behavior, but its documentation recommends `filter {}` for rules that apply to all objects because `prefix` is deprecated. Added `filter {}` to keep the example current.
- The ECS deploy action relied on the default `imagedefinitions.json` file name. This is technically valid, but the AWS ECS deploy action requires that image definitions file in the input artifact. Added `FileName = "imagedefinitions.json"` to make the required artifact contract explicit.
- The CodeStar Notifications SNS target snippet created an SNS topic but did not grant AWS CodeStar Notifications permission to publish to it. Added an SNS topic policy for the `codestar-notifications.amazonaws.com` service principal and made the notification rule depend on that policy.

## Review Notes
The snippets are accurate as infrastructure examples, but a complete deployable module still needs definitions not shown in the post, including the KMS key, CloudWatch log group, CodePipeline IAM role, IAM policies for CodePipeline and CodeBuild, ECS service resources, variables, and buildspec files that push to ECR and emit `imagedefinitions.json`.
