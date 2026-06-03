# Validation Summary: How to Create CodePipeline with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodePipeline
- AWS CodeConnections / CodeStarSourceConnection actions
- AWS CodeBuild
- Amazon ECS deployment actions
- Amazon S3 artifact stores
- AWS IAM service roles and policies
- Amazon SNS and CodeStar Notifications
- Terraform AWS provider

## Sources Consulted
- AWS CodePipeline User Guide: CodeStarSourceConnection source action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CodePipeline User Guide: Amazon ECS deploy action reference - https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-ECS.html
- AWS CodePipeline User Guide: Automate starting pipelines using triggers and filtering - https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-triggers.html
- AWS Developer Tools Console User Guide: Connections rename summary - https://docs.aws.amazon.com/dtconsole/latest/userguide/rename.html
- AWS Developer Tools Console User Guide: Create a notification rule - https://docs.aws.amazon.com/dtconsole/latest/userguide/notification-rule-create.html
- Terraform AWS provider: aws_codepipeline resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codepipeline
- Terraform AWS provider: aws_codeconnections_connection resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codeconnections_connection
- Terraform AWS provider: aws_codestarnotifications_notification_rule resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codestarnotifications_notification_rule
- Terraform AWS provider: aws_s3_bucket_server_side_encryption_configuration resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration

## Issues Found

1. **CodeStar Connections naming and Terraform resource were outdated.** AWS renamed CodeStar Connections to CodeConnections, and the current Terraform resource is `aws_codeconnections_connection`. Updated the prose, prerequisite, Terraform resource, connection references, and IAM action to use `codeconnections:UseConnection` with `aws_codeconnections_connection.github.arn`.

2. **ECS deploy permissions were incomplete.** AWS documents `ecs:TagResource` and `iam:PassRole` for both `ecs.amazonaws.com` and `ecs-tasks.amazonaws.com` in the ECS standard deploy action service role policy. Added `ecs:TagResource` and the missing `ecs.amazonaws.com` passed-to service.

3. **CodeStar Notifications SNS permissions were missing.** AWS and Terraform examples require an SNS topic policy allowing the `codestar-notifications.amazonaws.com` service principal to publish to the topic. Added an `aws_iam_policy_document` and `aws_sns_topic_policy` before the notification rule.

4. **The tag trigger example used a CodeCommit EventBridge event for a GitHub CodeConnections pipeline.** Replaced it with a CodePipeline V2 `trigger` block using `provider_type = "CodeStarSourceConnection"` and a Git tag push filter, which matches the source provider used elsewhere in the post.

## Review Notes
- The ECS deploy stage assumes the CodeBuild project produces an `imagedefinitions.json` file in `build_output`; this is correct for the ECS standard deploy action but should be implemented in the omitted CodeBuild project/buildspec.
- Terraform was not installed in the local environment, so I could not run `terraform validate`. Snippets were checked against official AWS documentation and the Terraform AWS provider resource documentation.
