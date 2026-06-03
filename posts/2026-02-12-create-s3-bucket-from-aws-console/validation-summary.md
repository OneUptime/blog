# Validation Summary: How to Create an S3 Bucket from the AWS Console

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- AWS Management Console
- AWS CLI
- S3 Block Public Access
- S3 Object Ownership and ACLs
- S3 Versioning
- S3 default encryption, SSE-S3, SSE-KMS, and DSSE-KMS
- S3 Object Lock
- Amazon CloudFront Origin Access Control

## Sources Consulted
- AWS S3 general purpose bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS S3 namespaces for general purpose buckets: https://docs.aws.amazon.com/AmazonS3/latest/userguide/gpbucketnamespaces.html
- AWS S3 Object Ownership and disabling ACLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- AWS S3 Block Public Access settings: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS S3 default encryption FAQ: https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html
- AWS S3 Bucket Keys for SSE-KMS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- AWS S3 Versioning documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/manage-versioning-examples.html
- AWS S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- AWS CLI `s3api create-bucket` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI `s3api put-bucket-tagging` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-tagging.html
- Amazon CloudFront OAC for S3 origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

## Issues Found
- Bucket namespace wording was too broad. The post said S3 bucket names are globally unique across all AWS accounts worldwide. AWS documents general purpose bucket uniqueness by AWS partition for the shared global namespace, with newer account regional namespace behavior also documented. Updated the wording to specify uniqueness within the same AWS partition.
- Bucket naming rules were missing current AWS restrictions that could make example guidance incomplete. Added notes that bucket names cannot contain adjacent dots and cannot use AWS-reserved prefixes or suffixes.
- Block Public Access settings were counted incorrectly. The post said there are four options but then listed five items by including the console's "Block all public access" master checkbox as one of the four settings. Updated the section to distinguish the master checkbox from the four underlying settings.

## Review Notes
- The AWS CLI command examples are consistent with the current AWS CLI reference. The `us-east-1` bucket creation example does not require a `LocationConstraint`; other Regions would require `--create-bucket-configuration LocationConstraint=<region>`.
- The local environment does not have the AWS CLI installed, so CLI verification was performed against the official AWS CLI documentation instead of local `--help` output.
- The internal OneUptime links referenced in the post map to existing post directories in this repository.
