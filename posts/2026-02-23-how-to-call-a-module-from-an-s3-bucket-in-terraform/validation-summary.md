# Validation Summary: How to Call a Module from an S3 Bucket in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform S3 module sources
- Terraform S3 backend
- AWS S3
- AWS IAM policies
- AWS CLI
- Bash scripting

## Sources Consulted
- Terraform module source syntax: https://developer.hashicorp.com/terraform/language/modules/syntax
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS S3 virtual-hosted-style and path-style URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html
- AWS S3 IAM actions and required permissions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html
- AWS S3 GetObject API documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
- AWS S3 object key model: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
- AWS CLI s3 cp command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Terraform AWS provider S3 bucket versioning resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning

## Issues Found
- The introduction said S3 versioning can handle module versions. S3 Versioning protects object versions, but the post's semantic module versions are handled by path naming, so this was changed to say S3 versioning helps protect module objects from accidental overwrites or deletions.
- The authentication section described a broader AWS credential chain than Terraform's documented S3 module installer lookup. It was narrowed to environment variables, the default shared credentials profile, and EC2 instance profile credentials.
- The IAM policy was described as the minimum required permissions while including `s3:ListBucket`. Downloading a known object requires `s3:GetObject`; listing is useful for browsing versions. The text now describes `s3:ListBucket` as optional for listing.
- The complete S3 backend example used the deprecated `dynamodb_table` locking setting. It now uses `use_lockfile = true` and raises `required_version` to `>= 1.10.0`, where S3 native lock files are supported.
- The versioning section referred to `latest.zip` as a symlink. S3 stores objects by key and does not provide filesystem symlinks, so the text now calls it a `latest.zip` object.

## Review Notes
The post's S3 module source syntax, archive packaging guidance, AWS CLI upload commands, S3 bucket resources, public access block, and version-path module strategy are consistent with official documentation. Terraform supports multiple archive extensions for S3 module sources, but the post intentionally focuses on zip archives.
