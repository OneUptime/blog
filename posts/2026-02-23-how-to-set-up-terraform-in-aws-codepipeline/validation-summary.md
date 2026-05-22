# Validation Summary: How to Set Up Terraform in AWS CodePipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS CodePipeline
- AWS CodeBuild
- Amazon S3 Terraform backend
- AWS IAM
- Amazon SNS
- Amazon EventBridge

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform `fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- HashiCorp Terraform `validate` command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp Terraform plan workflow documentation: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild project timeout documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html
- AWS CodePipeline CodeStarSourceConnection action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CodePipeline manual approval action documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html
- AWS CodePipeline pricing: https://aws.amazon.com/codepipeline/pricing/
- AWS CodeConnections rename announcement: https://aws.amazon.com/about-aws/whats-new/2024/03/aws-codeconnections-formerly-codestar-connections/

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. HashiCorp now documents DynamoDB-based locking as deprecated, so I changed the backend to `use_lockfile = true`.
- The state bootstrap section created a DynamoDB lock table. I removed that table from the example because S3 lockfile locking does not require it.
- The CodeBuild IAM policy granted DynamoDB lock permissions and broad S3 delete permissions for the state path. I replaced that with permissions for listing the state bucket, reading/writing the state file, and reading/writing/deleting the `.tflock` lock file.
- The pinned Terraform version was `1.7.0`, which predates the current S3 lockfile workflow. I updated the buildspec examples to `1.15.4`, the latest stable version listed on HashiCorp releases at review time.
- The pricing statement only described V1-style monthly pipeline pricing. I updated it to distinguish V1 per-active-pipeline pricing from V2 per-action-execution-minute pricing.
- The architecture overview implied every stage runs in CodeBuild and listed validation as a separate stage, while the example pipeline combines validation into the plan CodeBuild stage and has Source and Approval actions outside CodeBuild. I adjusted the wording to match the actual pipeline.
- The multiple-environment section said to use CodePipeline variables, but the snippet relies on an `ENVIRONMENT` variable in CodeBuild. I clarified that `ENVIRONMENT` must be passed to CodeBuild.
- The monitoring section referred to CloudWatch Events. I updated the prose to Amazon EventBridge while leaving the Terraform AWS provider resource names intact.

## Review Notes
- The examples are intentionally illustrative and still omit surrounding resources such as the CodePipeline service role, artifact bucket, and connection resource definitions.
- AWS renamed CodeStar Connections to CodeConnections, but the CodePipeline action provider remains `CodeStarSourceConnection` and the Terraform AWS provider still documents `aws_codestarconnections_connection`, so the source action example remains valid.
- Local `terraform` and `aws` CLIs were not installed in the review environment, so validation was performed against official documentation and static review rather than live command execution.
