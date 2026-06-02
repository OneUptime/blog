# Validation Summary: How to Reduce S3 Storage Costs with Lifecycle Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- Amazon S3 Lifecycle configurations
- Amazon S3 storage classes
- AWS CLI
- Terraform AWS provider
- Python
- Boto3

## Sources Consulted
- Amazon S3 User Guide: Transitioning objects using Amazon S3 Lifecycle - https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 User Guide: Lifecycle configuration elements - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS CLI Command Reference: put-bucket-lifecycle-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI Command Reference: put-bucket-intelligent-tiering-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-intelligent-tiering-configuration.html
- Amazon S3 pricing - https://aws.amazon.com/s3/pricing/
- Terraform Registry: aws_s3_bucket_lifecycle_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Boto3 S3 client put_object documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html
- Boto3 S3 client list_objects_v2 documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_objects_v2.html

## Issues Found
- The intro and storage class table used region-specific S3 prices without saying they were region-specific. Updated the wording to state that the listed prices use US East (N. Virginia) as an example.
- The log lifecycle section said the example deletes logs after a year, but the JSON expiration was 730 days. Updated the text to say two years.
- The Terraform backup lifecycle rule transitioned objects to Standard-IA after 7 days, which S3 Lifecycle does not allow because objects must be stored for at least 30 days before transition to Standard-IA or One Zone-IA. Changed the Standard-IA transition to 30 days and the following Glacier transition to 90 days so the rule respects minimum-duration sequencing.
- The bucket analysis script estimated "old Standard" savings from all objects older than 90 days, including objects already in other storage classes. Added a Standard-only age distribution and based the savings estimate on that.
- The bucket analysis script stopped processing objects after the sample size but would continue paginating through the bucket. Added an outer break once the sample size is reached.
- The bucket analysis script used naive UTC datetime handling. Updated it to compare Boto3's timezone-aware `LastModified` values against `datetime.now(timezone.utc)`.
- The Intelligent-Tiering section said there is no retrieval fee without qualification. Updated it to say standard and bulk retrievals are free, matching AWS pricing caveats.
- The small-objects gotcha described only Standard-IA billing. Updated it to reflect current S3 Lifecycle default behavior for new or modified configurations and the 128 KB minimum billable object size for Standard-IA, One Zone-IA, and Glacier Instant Retrieval.

## Review Notes
- JSON lifecycle snippets parse successfully.
- Python snippets compile successfully with `python3`.
- `aws` and `terraform` binaries were not installed in this environment, so CLI and HCL validation was performed against official documentation rather than local command execution.
- S3 prices and retrieval fees are region-specific and can change; future reviews should re-check AWS pricing before republishing exact dollar amounts.
