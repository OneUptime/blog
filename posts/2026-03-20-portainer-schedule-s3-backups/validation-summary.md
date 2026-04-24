# Validation Summary: How to Schedule Automatic Backups to S3 in Portainer Business Edition (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Business Edition
- Amazon S3
- MinIO / S3-compatible object storage
- AWS IAM policies
- Cron scheduling

## Sources Consulted
- Portainer Documentation: General settings / Back up Portainer — https://docs.portainer.io/admin/settings/general
- Portainer Documentation: What does Portainer's backup include? — https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Amazon S3 documentation: Policies and permissions in Amazon S3 — https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-policy-language-overview.html
- Amazon S3 documentation: Required permissions for Amazon S3 API operations — https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html
- AWS IAM example: Grant read and write access to Amazon S3 bucket objects — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_rw-bucket.html

## Issues Found
1. The post implied that S3 backups are always encrypted. Portainer only encrypts backups when **Password protect** is enabled, so I corrected the description, intro, and settings table to make encryption optional.
2. The S3 backup setup steps used the wrong UI flow. Portainer documents S3 backups under **Settings** in the **Back up Portainer** section after selecting **Store in S3**, so I updated the steps accordingly.
3. The settings table included a non-documented `Bucket directory` field, used `Schedule` instead of `Cron rule`, and omitted `S3 compatible host` and `Password protect`. I replaced the field list with the documented Portainer S3 options.
4. The IAM policy example mixed bucket-level and object-level permissions in a way that was not a clean S3 policy example. I rewrote it as a valid example with separate `s3:ListBucket` and `s3:GetObject` / `s3:PutObject` permissions.
5. The restore instructions were incorrect. Portainer restores from S3 only during initial setup on a fresh instance with an empty data volume, not from the running admin settings page, so I corrected that workflow and added the required filename step.
6. The MinIO example omitted the secret access key and used inconsistent field labels. I completed the example and aligned it with the documented Portainer terminology.

## Review Notes
- Portainer backups cover Portainer configuration and Portainer-managed stack definitions, not the containers, volumes, or application data running in the managed environments.
- Current Portainer documentation also notes that the access key fields can be left blank when credentials are resolved by the AWS SDK from the environment, such as with IAM roles.
