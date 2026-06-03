# Validation Summary: How to Use AWS Signer for Code Signing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Signer
- AWS Lambda code signing
- Amazon S3 versioned deployment artifacts
- Amazon ECR container image signing with Notation
- AWS CLI
- GitHub Actions
- Terraform AWS provider
- AWS CloudTrail

## Sources Consulted
- AWS Lambda Developer Guide: Lambda code signing with AWS Signer - https://docs.aws.amazon.com/lambda/latest/dg/governance-code-signing.html
- AWS Signer Developer Guide: Create a Signer signing profile - https://docs.aws.amazon.com/signer/latest/developerguide/signing-profiles.html
- AWS Signer API Reference: StartSigningJob - https://docs.aws.amazon.com/signer/latest/api/API_StartSigningJob.html
- AWS CLI Command Reference: signer start-signing-job - https://docs.aws.amazon.com/cli/latest/reference/signer/start-signing-job.html
- AWS CLI Command Reference: signer describe-signing-job - https://docs.aws.amazon.com/cli/latest/reference/signer/describe-signing-job.html
- AWS CLI Command Reference: signer list-signing-platforms - https://docs.aws.amazon.com/cli/latest/reference/signer/list-signing-platforms.html
- AWS CLI Command Reference: signer list-signing-jobs - https://docs.aws.amazon.com/cli/latest/reference/signer/list-signing-jobs.html
- AWS CLI Command Reference: signer revoke-signing-profile - https://docs.aws.amazon.com/cli/latest/reference/signer/revoke-signing-profile.html
- AWS CLI Command Reference: lambda create-code-signing-config - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-code-signing-config.html
- AWS CLI Command Reference: lambda put-function-code-signing-config - https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-code-signing-config.html
- AWS Signer Developer Guide: Sign an image - https://docs.aws.amazon.com/signer/latest/developerguide/image-signing-steps.html
- Amazon ECR User Guide: Sign images in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-signing.html
- Terraform Registry: aws_lambda_code_signing_config - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_code_signing_config
- Terraform Registry: aws_signer_signing_profile - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/signer_signing_profile

## Issues Found
- The post uploaded Lambda artifacts with `aws s3 cp` and then used a hard-coded S3 object version in `start-signing-job`. AWS Signer requires a versioned S3 source object and the `source.s3.version` field is required. Changed the examples to upload with `aws s3api put-object`, capture `VersionId`, and pass that version to the signing job.
- The CI/CD example omitted the required S3 object version in `start-signing-job`. Added an upload step ID, captured `VersionId`, and used it in the signing job source.
- The Lambda deployment example guessed the signed artifact key. AWS Signer returns the signed object location in `describe-signing-job`. Changed the example to query `signedObject.s3.key` and deploy that key.
- Two AWS CLI JMESPath queries used capitalized response keys such as `Platforms`, `Jobs`, and `JobId`. AWS CLI Signer responses use lower camel case keys such as `platforms`, `jobs`, and `jobId`. Updated both queries.
- The example signing profile version and code signing config ARN placeholders did not match documented AWS patterns. Replaced them with valid-shaped placeholders.
- The revocation explanation said revoking a profile version makes all code signed with it invalid. AWS documents revocation as applying to signatures generated at or after the effective time. Updated the explanation.
- The description and opening explanation implied AWS generally enforces deployment rejection for all artifact types, including container images. Narrowed the enforcement language to Lambda code signing and described container images as signed artifacts.

## Review Notes
- The local environment did not have `aws` or `terraform` installed, so CLI and Terraform checks were performed against official AWS CLI, AWS service, and Terraform Registry documentation.
- The Terraform snippet is structurally correct for the resources shown, but it remains a partial example because supporting resources such as the Lambda IAM role and the signed S3 object lifecycle are outside the snippet.
