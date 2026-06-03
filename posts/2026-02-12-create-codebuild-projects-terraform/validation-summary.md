# Validation Summary: How to Create CodeBuild Projects with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CodeBuild
- AWS IAM
- AWS CloudWatch Logs
- Amazon S3
- Amazon ECR
- AWS Secrets Manager
- AWS CodePipeline
- Terraform AWS provider
- Buildspec YAML
- Docker

## Sources Consulted
- AWS CodeBuild User Guide: EC2 compute images - https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- AWS CodeBuild User Guide: Publish Docker image to Amazon ECR sample - https://docs.aws.amazon.com/codebuild/latest/userguide/sample-docker.html
- AWS CodeBuild User Guide: Build specification reference - https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild User Guide: Amazon S3 caching - https://docs.aws.amazon.com/codebuild/latest/userguide/caching-s3.html
- AWS CodeBuild User Guide: Cache builds to improve performance - https://docs.aws.amazon.com/codebuild/latest/userguide/build-caching.html
- AWS CodeBuild User Guide: Service role setup - https://docs.aws.amazon.com/codebuild/latest/userguide/setting-up-service-role.html
- AWS CodeBuild User Guide: Identity-based policies and VPC network interface permissions - https://docs.aws.amazon.com/codebuild/latest/userguide/auth-and-access-control-iam-identity-based-access-control.html
- AWS CodeBuild API Reference: WebhookFilter - https://docs.aws.amazon.com/codebuild/latest/APIReference/API_WebhookFilter.html
- Terraform AWS Provider: aws_codebuild_project - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project
- Terraform AWS Provider: aws_codebuild_webhook - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_webhook

## Issues Found
- The post said every CodeBuild project needs three things but omitted the artifacts configuration, which is required in the Terraform `aws_codebuild_project` examples. Updated the wording to include artifacts configuration.
- The examples used `aws/codebuild/amazonlinux2-x86_64-standard:5.0`. AWS now documents the current Amazon Linux 2023 standard 5.0 image identifier as `aws/codebuild/amazonlinux-x86_64-standard:5.0`, while noting the old alias remains supported. Updated all examples to the current documented identifier.
- The S3 cache example created a cache bucket but did not grant the CodeBuild service role permissions to use that bucket. Added a scoped IAM policy for `s3:PutObject`, `s3:GetObject`, `s3:GetBucketAcl`, and `s3:GetBucketLocation` on the cache bucket.
- The local Docker layer cache comment did not mention that Docker layer caching requires privileged mode. Updated the comment to include `privileged_mode = true`.

## Review Notes
- The Terraform snippets use placeholder names, bucket names, GitHub repository URLs, and ECR repository references that must be adapted for a real AWS account.
- For GitHub source projects, users may also need to configure CodeBuild source credentials or a connection depending on repository visibility and account setup.
