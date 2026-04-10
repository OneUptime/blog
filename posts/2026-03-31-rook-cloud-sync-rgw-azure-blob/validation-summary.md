# Validation Summary: How to Configure Cloud Sync Module for RGW to Azure Blob

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph RGW Cloud Sync Module
- rclone (S3 proxy to Azure Blob)
- Azure Blob Storage
- Azure Functions (Python v2 model)
- RGW Bucket Notifications (SNS-style)
- boto3 (AWS SDK for Python)
- Azure Storage Blob SDK for Python
- Azure CLI (`az`)

## Sources Consulted
- rclone serve s3 documentation: https://rclone.org/commands/rclone_serve_s3/
- rclone Azure Blob backend documentation: https://rclone.org/azureblob/
- Ceph RGW Cloud Sync Module documentation: https://docs.ceph.com/en/latest/radosgw/cloud-sync-module/
- Ceph RGW Bucket Notifications documentation: https://docs.ceph.com/en/latest/radosgw/notifications/
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Azure Functions Python developer guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Azure Blob Storage Python SDK documentation: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/

## Issues Found

1. **Overview incorrectly claimed Azure has S3 compatibility layer**: The overview stated "Azure Blob Storage supports an S3-compatible API through Azure Blob's S3 compatibility layer." Azure Blob does not have a native S3 compatibility layer. Fixed to clarify that an S3-compatible proxy (like rclone) is required.

2. **rclone config had redundant and inconsistent `endpoint` parameter**: The `rclone config create` command specified `endpoint=myaccount.blob.core.windows.net` while the account was `my-storage-account` (mismatched names). The endpoint is auto-derived from the account name for standard Azure public cloud, so the parameter was removed entirely.

3. **Invalid `rclone serve s3` authentication flags**: The command used `--s3-authkey-id` and `--s3-authkey-secret`, which are not valid rclone flags. The correct flag is `--auth-key accessKeyID,secretAccessKey` (a single flag with comma-separated values). Fixed to use `--auth-key fake-access-key,fake-secret-key`.

4. **Wrong tier type for cloud sync zone**: The `radosgw-admin zone create` command used `--tier-type=cloud`, but the correct value for the Ceph RGW cloud sync module is `--tier-type=cloud-s3`. Fixed.

5. **Missing SNS topic creation before bucket notification configuration**: The bucket notification configuration referenced a topic ARN (`arn:aws:sns:::rgw-azure-topic`) but the topic was never created. In RGW, you must create the SNS topic first via `aws sns create-topic` with a `push-endpoint` attribute before referencing it in a notification configuration. Added the missing `sns create-topic` command.

6. **`delete_from_azure` function called but never defined**: The Azure Function code called `delete_from_azure(bucket, key)` for `ObjectRemoved` events, but the function was never defined. This would cause a `NameError` at runtime. Added the missing function implementation.

7. **Unused `json` import**: The `import json` statement was present but `json` was never used in the code. Removed.

## Review Notes
- The rclone S3 proxy approach is a creative workaround for Azure's lack of native S3 API support. However, running rclone as a long-lived proxy in production would need additional considerations (process supervision, TLS termination, high availability) that are beyond the scope of this tutorial.
- The Azure Function consumer approach (Steps 3-4) is an alternative event-driven pattern. The post could benefit from clarifying that Steps 1-2 and Steps 3-4 are two independent approaches, not sequential steps in a single workflow.
- The `radosgw-admin sync status --rgw-zone=azure-zone` command may not filter by zone as expected; sync status typically reports on the daemon's configured zone. This is not incorrect but worth noting.
- The multipart tier-config parameters in Step 6 (`multipart_sync_threshold`, `multipart_min_part_size`, `retain_head_object`) are valid cloud sync module configuration options.
