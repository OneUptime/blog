# Validation Summary: How to Set Up S3 Lifecycle Policies with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 Lifecycle policies
- Terraform
- HashiCorp AWS Provider
- S3 storage classes and cost optimization

## Sources Consulted
- HashiCorp AWS Provider documentation for `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- HashiCorp Terraform AWS Provider source documentation for `aws_s3_bucket_lifecycle_configuration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- AWS S3 User Guide, Managing the lifecycle of objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
- AWS S3 User Guide, Lifecycle configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS S3 User Guide, Transitioning objects using Amazon S3 Lifecycle: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS S3 User Guide, Configuring a bucket lifecycle configuration to delete incomplete multipart uploads: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html

## Issues Found
- The post showed multiple `aws_s3_bucket_lifecycle_configuration` resources using the same bucket in separate examples without warning that S3 buckets only support one lifecycle configuration. I added a note explaining that multiple lifecycle rules for the same bucket must be placed in one `aws_s3_bucket_lifecycle_configuration` resource, and changed the incomplete multipart upload example to a `rule` block to add to an existing lifecycle configuration.
- The small-object pitfall described only the `STANDARD_IA` minimum billable object size. Current S3 Lifecycle behavior prevents objects smaller than 128 KB from transitioning by default unless object size filters override that behavior. I updated the pitfall to reflect the current default and the cost concern for small-object transitions.

## Review Notes
The Terraform lifecycle rule syntax, transition blocks, expiration blocks, prefix filters, tag filters, combined `and` filters, noncurrent version lifecycle blocks, versioning dependency, and dynamic expiration example match current HashiCorp AWS Provider documentation. The storage class transition timing explanation is correct: transition `days` values are relative to object creation for current versions, and noncurrent lifecycle timing is based on the number of days since the object became noncurrent.
