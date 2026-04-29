# Validation Summary: How to Create Lambda Functions with Container Image in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Lambda
- Amazon ECR
- AWS IAM
- AWS X-Ray
- Docker
- AWS CLI

## Sources Consulted
- AWS Lambda Developer Guide: Create a Lambda function using a container image — https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- AWS Lambda Developer Guide: Deploy Python Lambda functions with container images — https://docs.aws.amazon.com/lambda/latest/dg/python-image.html
- AWS Lambda API Reference: CreateFunction — https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html
- AWS Lambda API Reference: ImageConfig — https://docs.aws.amazon.com/lambda/latest/api/API_ImageConfig.html
- AWS Lambda Developer Guide: Visualize Lambda function invocations using AWS X-Ray — https://docs.aws.amazon.com/lambda/latest/dg/lambda-x-ray.html
- AWS Lambda Developer Guide: Improving startup performance with Lambda SnapStart — https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- AWS Lambda Developer Guide: Configure Lambda function memory — https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html
- AWS Lambda Developer Guide: Lambda quotas — https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS CLI Command Reference: ecr get-login-password — https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Terraform Registry / HashiCorp AWS Provider: aws_ecr_repository — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform Registry / HashiCorp AWS Provider: aws_ecr_lifecycle_policy — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- Terraform Registry / HashiCorp AWS Provider: aws_iam_role_policy_attachment — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- Terraform Registry / HashiCorp AWS Provider: aws_lambda_function — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function

## Issues Found
1. **The introduction overstated Lambda container image behavior.** The post said Lambda functions were "up to 10 GB in size" and implied arbitrary runtime support through custom base images. I changed this to the documented behavior: Lambda supports container images up to 10 GB uncompressed, and custom runtimes or alternative base images must implement the Lambda Runtime API.

2. **The ECR lifecycle policy comment was broader than the actual rule.** The policy only applies to tags with the `v` prefix, not all tagged images. I updated the comment and rule description to say "version-tagged images."

3. **The Lambda execution role was missing X-Ray permissions.** The function enables `tracing_config { mode = "Active" }`, but the role only had `AWSLambdaBasicExecutionRole`. I added `AWSXRayDaemonWriteAccess`, which AWS documents as required for active tracing.

4. **The Lambda and Docker examples did not pin a matching single architecture.** Lambda container images must target one architecture, and the function architecture must match the image build. I added `architectures = ["x86_64"]` and changed the build command to `docker buildx build --platform linux/amd64 --provenance=false ...`.

5. **The conclusion recommended SnapStart for container image functions.** SnapStart is not supported for Lambda container images. I replaced that guidance with provisioned concurrency for container-image cold-start reduction.

6. **The memory comment used a hard-coded maximum that is inconsistent across current AWS docs.** AWS's API reference and quota/configuration pages currently disagree on the maximum memory value, so I removed the numeric claim and kept the working example value unchanged.

## Review Notes
- The example still assumes the principal running `tofu apply` has the ECR permissions AWS documents for image-based Lambda creation, including `ecr:GetRepositoryPolicy`, `ecr:SetRepositoryPolicy`, `ecr:BatchGetImage`, and `ecr:GetDownloadUrlForLayer`, or that an explicit ECR repository policy is managed separately.
- The ECR example uses `encryption_type = "KMS"` and therefore assumes `var.kms_key_arn` points to an existing KMS key.
