# Validation Summary: How to Create S3 Access Points with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon S3 buckets
- Amazon S3 Access Points
- Amazon S3 bucket and access point policies
- AWS IAM policy actions, resources, and condition keys
- Boto3 S3 client

## Sources Consulted
- Amazon S3 User Guide: Configuring IAM policies for using access points - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-policies.html
- Amazon S3 User Guide: Creating access points restricted to a virtual private cloud - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-vpc.html
- Amazon S3 User Guide: Blocking public access to your Amazon S3 storage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon S3 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Terraform AWS Provider: `aws_s3_access_point` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_access_point
- Terraform AWS Provider: `aws_s3control_access_point_policy` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3control_access_point_policy
- Terraform AWS Provider: `aws_s3_bucket_policy` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- Terraform AWS Provider: `aws_caller_identity` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity
- Boto3 S3 client `list_objects_v2` documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_objects_v2.html
- Boto3 S3 client `get_object` documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_object.html
- OpenTofu CLI command documentation - https://opentofu.org/docs/cli/commands/

## Issues Found
- The analytics access point policy claimed to be read-only to the `analytics/` prefix, but the `s3:ListBucket` permission was not restricted by `s3:prefix`. I split `s3:GetObject` and `s3:ListBucket` into separate statements and added an `s3:prefix` condition for listing under `analytics/`.
- The bucket policy referenced `data.aws_caller_identity.current.account_id` without defining the `aws_caller_identity` data source. I added `data "aws_caller_identity" "current" {}` before the bucket policy.
- The ingestion access point policy allowed `s3:AbortMultipartUpload`, but the bucket delegation policy did not. Since access through an S3 Access Point must be allowed by both the access point policy and the underlying bucket policy, I added `s3:AbortMultipartUpload` to the delegated bucket actions.

## Review Notes
- The Boto3 examples correctly use an S3 Access Point ARN as the `Bucket` parameter for supported S3 operations.
- The OpenTofu commands shown (`tofu init`, `tofu plan`, `tofu apply`) are current and valid.
- For the optional VPC-restricted access point, AWS also requires requests to originate from the configured VPC, and real deployments should ensure the relevant S3 VPC endpoint policy permits access to both the access point and the underlying bucket.
