# Validation Summary: How to Design a CI/CD Infrastructure Module for OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS CodeBuild
- AWS CodePipeline integration points
- Amazon ECR
- AWS IAM
- Amazon S3

## Sources Consulted
- OpenTofu language syntax and expressions: https://opentofu.org/docs/language/syntax/
- OpenTofu type constraints and object/map syntax: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu `replace` function: https://opentofu.org/docs/language/functions/replace/
- OpenTofu `dynamic` blocks: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild service role permissions: https://docs.aws.amazon.com/codebuild/latest/userguide/setting-up-service-role.html
- AWS CodeBuild managed EC2 images: https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- Amazon ECR image scanning: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR repository naming rules: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-create.html
- AWS CLI `ecr create-repository` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html

## Issues Found
1. **The prose overstated what the module actually provisions.** The original description and introduction said the module creates CodePipeline pipelines and approval gates, but the code only created ECR repositories, a CodeBuild project, and supporting IAM/S3 wiring for CodePipeline-compatible artifacts. I updated the description, introduction, and conclusion to match the implementation and removed unused GitHub/approval inputs from the example.

2. **Parts of the HCL example were not valid as written.** The inline `jsonencode` objects used semicolon-separated fields, and the example mixed that style into other one-line declarations. I rewrote the policy and variable examples into valid multi-line HCL.

3. **The CodeBuild S3 permissions were incomplete for the documented use case.** AWS documents `s3:GetBucketAcl`, `s3:GetBucketLocation`, and `s3:GetObjectVersion` alongside object read/write access in the baseline service-role policy. I added those permissions and split bucket-level and object-level resources correctly.

4. **The generated CodeBuild environment variable names were too loosely sanitized.** Amazon ECR repository names can include periods and forward slashes, but the original expression only replaced hyphens. I changed the expression to replace any non-alphanumeric character with `_` so valid repository names still produce usable environment variable names.

## Review Notes
- `aws/codebuild/standard:7.0` is still a supported CodeBuild managed image as of May 1, 2026, although newer managed images also exist.
- The ECR `scan_on_push` example is technically valid, but AWS now also emphasizes registry-level scanning configuration for broader repository management. Teams standardizing organization-wide scanning may want to manage that separately.
- The example still grants `ecr:*` to the CodeBuild role. That is functional, but broader than least privilege; a production module would typically scope this down to the specific push/pull actions the build actually needs.
