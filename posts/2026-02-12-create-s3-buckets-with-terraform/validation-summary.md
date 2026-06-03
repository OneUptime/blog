# Validation Summary: How to Create S3 Buckets with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- Terraform
- HashiCorp AWS Provider
- AWS KMS / S3 server-side encryption
- S3 lifecycle rules
- S3 bucket policies
- S3 CORS configuration

## Sources Consulted
- HashiCorp Terraform AWS Provider: aws_s3_bucket - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- HashiCorp Terraform AWS Provider: aws_s3_bucket_versioning - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- HashiCorp Terraform AWS Provider: aws_s3_bucket_server_side_encryption_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- HashiCorp Terraform AWS Provider: aws_s3_bucket_public_access_block - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- HashiCorp Terraform AWS Provider: aws_s3_bucket_lifecycle_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- HashiCorp Terraform AWS Provider: aws_s3_bucket_cors_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_cors_configuration
- HashiCorp Terraform provider requirements documentation - https://developer.hashicorp.com/terraform/language/providers/requirements
- AWS S3 default bucket encryption documentation - https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html
- AWS S3 versioning documentation - https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
- AWS S3 lifecycle configuration elements - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS S3 deleting object versions from a versioning-enabled bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html
- AWS S3 bucket policy examples for HTTPS-only access - https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- AWS S3 bucket naming rules - https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html

## Issues Found
- The server-side encryption section said the example configured AES256 encryption, but the Terraform code used `sse_algorithm = "aws:kms"`. Updated the prose and code comment to describe SSE-KMS encryption accurately.
- The lifecycle section said objects would be deleted after a year, but the article enables versioning. In a versioning-enabled bucket, current-version expiration creates a delete marker and noncurrent versions require `noncurrent_version_expiration` for permanent removal. Updated the explanation and added `noncurrent_version_expiration`.
- The lifecycle examples omitted explicit `filter {}` blocks. The current Terraform AWS Provider documentation recommends `filter` because the legacy `prefix` argument is deprecated and rules should explicitly identify the objects they apply to. Added empty filters to apply the rules to all objects.
- The bucket policy section said the policy required uploads to use SSL/TLS, but the policy denies all S3 actions over insecure transport. Updated the explanation to say all access.
- The common pitfalls section implied lifecycle configurations generally require versioning first. Updated it to specify lifecycle rules that manage noncurrent versions.
- The "Putting It All Together" section said the final module combined everything covered, but the code only included the core bucket, versioning, encryption, and public access resources. Updated the claim to match the code.

## Review Notes
- Terraform CLI is not installed in the review environment, so `terraform validate` could not be run. The snippets were checked against the official Terraform AWS Provider resource schemas and AWS S3 documentation.
- The provider constraint `~> 5.0` is still valid for the examples, though the latest AWS provider documentation is now in the 6.x series.
