# Validation Summary: How to Migrate Amazon S3 Buckets to Google Cloud Storage

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Storage
- Google Cloud Storage Transfer Service
- Amazon S3
- AWS IAM
- Google Cloud CLI
- Terraform Google provider
- Python
- boto3
- Google Cloud Python client libraries

## Sources Consulted
- Google Cloud Storage Transfer Service Amazon S3 source access documentation: https://docs.cloud.google.com/storage-transfer/docs/source-amazon-s3
- Google Cloud Storage Transfer Service Amazon S3 to Cloud Storage transfer guide: https://docs.cloud.google.com/storage-transfer/docs/create-transfers/agentless/s3
- Google Cloud SDK reference for `gcloud transfer jobs create`: https://docs.cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- Google Cloud Storage Transfer Service agentless permissions documentation: https://docs.cloud.google.com/storage-transfer/docs/iam-cloud
- Google Cloud Storage Transfer Service TransferOptions REST reference: https://docs.cloud.google.com/storage-transfer/docs/reference/rest/v1/TransferOptions
- Google Cloud Storage Transfer Service manage transfers documentation: https://docs.cloud.google.com/storage-transfer/docs/manage-transfers
- Google Cloud Storage Transfer Service data integrity documentation: https://docs.cloud.google.com/storage-transfer/docs/data-integrity
- Terraform Google provider `google_storage_transfer_job` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_transfer_job.html
- Google Cloud Python Storage Transfer client reference: https://docs.cloud.google.com/python/docs/reference/storagetransfer/latest/google.cloud.storage_transfer_v1.services.storage_transfer_service.StorageTransferServiceClient
- Google Cloud Python Storage Blob reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- Google Cloud Storage XML API request endpoints documentation: https://docs.cloud.google.com/storage/docs/request-endpoints
- Google Cloud Storage HMAC key documentation: https://docs.cloud.google.com/storage/docs/authentication/managing-hmackeys
- Boto3 S3 `list_objects_v2` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_objects_v2.html
- Boto3 Session reference for `endpoint_url`: https://docs.aws.amazon.com/boto3/latest/reference/core/session.html

## Issues Found
- The AWS IAM policy was described as minimal but included `s3:GetBucketLocation` and `s3:GetObjectVersion`. Google documents `s3:ListBucket` and `s3:GetObject` as the minimum for current-version transfers, with version and delete permissions only needed for version-specific manifests or source deletion. I removed the extra actions from the minimal policy.
- The credential setup stored the access key ID and secret access key as two separate Secret Manager secrets, but the `gcloud transfer jobs create --source-creds-file` flow expects one local JSON file. I changed the example to create `aws-creds.json` in the documented format and added a note that Secret Manager credentials require a single JSON secret and REST API `awsS3DataSource.credentialsSecret`.
- The Terraform object condition example was shown as a second commented `transfer_spec` block, which would be the wrong place to uncomment it. I moved the commented `object_conditions` block inside the existing `transfer_spec`.
- The Terraform transfer options mixed the older boolean overwrite option with `overwrite_when`. I kept the current `overwrite_when = "DIFFERENT"` setting and removed the redundant boolean option.
- The Python monitoring sample used `client.list_transfer_operations`, which is not part of the current `StorageTransferServiceClient` surface. I updated the sample to get the job's `latest_operation_name`, then fetch and deserialize that operation through the operations client, matching the official Python sample.
- The verification sample claimed data integrity verification but only compared object sizes and imported an unused `hashlib`. I updated it to compare sizes and, when safe, compare simple S3 ETag values to Cloud Storage MD5 hashes while skipping cases where S3 ETags are not reliable MD5 values.
- The prefix parallelism command encoded the prefix in the source and destination URI paths. I changed it to keep the bucket URIs stable and use the documented `--include-prefixes` flag for each job.
- The S3-compatible GCS example said existing S3 code works with minimal changes. I narrowed the wording to many S3 object operations, because Cloud Storage interoperability does not imply every S3 API behavior is supported.

## Review Notes
The post is technically valid after fixes. For production migrations, future improvements could mention granting the Storage Transfer Service service agent permissions on the destination bucket and avoiding plaintext AWS secrets in Terraform state.
