# Validation Summary: How to Configure Storage Gateway File Gateway for S3 Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Storage Gateway S3 File Gateway
- Amazon S3
- Amazon S3 lifecycle policies and storage classes
- AWS Identity and Access Management (IAM)
- AWS CLI
- NFS
- SMB
- Amazon CloudWatch and EventBridge scheduled rules

## Sources Consulted
- AWS CLI Command Reference: create-nfs-file-share - https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-nfs-file-share.html
- AWS CLI Command Reference: create-smb-file-share - https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-smb-file-share.html
- AWS CLI Command Reference: join-domain - https://docs.aws.amazon.com/cli/latest/reference/storagegateway/join-domain.html
- AWS CLI Command Reference: set-smb-guest-password - https://docs.aws.amazon.com/cli/latest/reference/storagegateway/set-smb-guest-password.html
- AWS CLI Command Reference: refresh-cache - https://docs.aws.amazon.com/cli/latest/reference/storagegateway/refresh-cache.html
- AWS Storage Gateway User Guide: Granting access to an Amazon S3 bucket - https://docs.aws.amazon.com/filegateway/latest/files3/grant-access-s3.html
- AWS Storage Gateway User Guide: Using storage classes - https://docs.aws.amazon.com/filegateway/latest/files3/storage-classes.html
- AWS Storage Gateway User Guide: Refreshing Amazon S3 bucket object cache - https://docs.aws.amazon.com/filegateway/latest/files3/refresh-cache.html
- AWS Storage Gateway metrics documentation - https://docs.aws.amazon.com/storagegateway/latest/tgw/MonitoringGateways-common.html
- AWS Storage Gateway FAQs - https://aws.amazon.com/storagegateway/faqs/
- AWS CLI Command Reference: get-metric-data - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-data.html

## Issues Found
- The lifecycle policy transitioned objects to `GLACIER_IR` and described Glacier Instant Retrieval as a good File Gateway target. AWS states that S3 File Gateway does not officially support S3 Glacier Instant Retrieval and does not recommend using it with File Gateway. I removed the `GLACIER_IR` transition and updated the explanation to cover only `STANDARD_IA`.
- The IAM role policy was too minimal for documented File Gateway S3 access. I updated it to match AWS's documented bucket-level and object-level permissions, including versioning, multipart upload, and ACL actions used by File Gateway.
- The SMB guest-access example passed `--valid-user-list` and `--invalid-user-list`, but AWS documents those options as only valid when `--authentication` is `ActiveDirectory`. I removed those options from the GuestAccess example.

## Review Notes
The remaining commands and explanations are broadly accurate for current AWS CLI and Storage Gateway documentation. The post could later mention `--cache-attributes CacheStaleTimeoutInSeconds=...` as the native TTL-based automatic cache refresh option, but the existing manual refresh and EventBridge/Lambda approach is still valid.
