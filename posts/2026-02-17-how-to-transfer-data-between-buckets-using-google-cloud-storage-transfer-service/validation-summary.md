# Validation Summary: How to Transfer Data Between Buckets Using Google Cloud Storage Transfer Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Storage
- Storage Transfer Service
- gcloud CLI
- Storage Transfer Service REST API
- Google Cloud Storage Transfer Python client library
- IAM roles for Cloud Storage buckets

## Sources Consulted
- Google Cloud Storage Transfer Service: Transfer between Cloud Storage buckets: https://docs.cloud.google.com/storage-transfer/docs/cloud-storage-to-cloud-storage
- Google Cloud Storage Transfer Service: Create transfers: https://docs.cloud.google.com/storage-transfer/docs/create-transfers
- Google Cloud Storage Transfer Service: Agentless transfer permissions: https://docs.cloud.google.com/storage-transfer/docs/iam-cloud
- Google Cloud Storage Transfer Service: Configure access to a source, Cloud Storage: https://docs.cloud.google.com/storage-transfer/docs/source-cloud-storage
- Google Cloud Storage Transfer Service: Configure access to a sink, Cloud Storage: https://docs.cloud.google.com/storage-transfer/docs/sink-cloud-storage
- Storage Transfer Service REST API, googleServiceAccounts.get: https://docs.cloud.google.com/storage-transfer/docs/reference/rest/v1/googleServiceAccounts/get
- Storage Transfer Service REST API, TransferOptions: https://docs.cloud.google.com/storage-transfer/docs/reference/rest/v1/TransferOptions
- gcloud transfer jobs monitor reference: https://cloud.google.com/sdk/gcloud/reference/transfer/jobs/monitor
- Google Cloud Storage Transfer Python client reference: https://docs.cloud.google.com/python/docs/reference/storagetransfer/latest/google.cloud.storage_transfer_v1.services.storage_transfer_service.StorageTransferServiceClient
- Google Cloud Storage Transfer Python GcsData reference: https://docs.cloud.google.com/python/docs/reference/storagetransfer/latest/google.cloud.storage_transfer_v1.types.GcsData
- Google Cloud Storage Transfer Python Schedule reference: https://docs.cloud.google.com/python/docs/reference/storagetransfer/latest/google.cloud.storage_transfer_v1.types.Schedule

## Issues Found
- The post used `gcloud transfer service-account --project=...`, but the current gcloud transfer command group does not document a `service-account` command. Replaced it with a `curl` call to the official `googleServiceAccounts.get` REST endpoint.
- The bucket IAM examples granted only `roles/storage.objectViewer` on the source and `roles/storage.objectCreator` on the destination. Google documents `roles/storage.legacyBucketReader` plus `roles/storage.objectViewer` for Cloud Storage sources, and `roles/storage.legacyBucketWriter` plus `roles/storage.objectViewer` for default overwrite behavior on Cloud Storage sinks. Updated the examples accordingly.
- The cross-project section implied either project's service account could be granted access to the opposite bucket. Google documents that the service agent from the project creating the transfer job must be granted access to both buckets. Updated the explanation and example.
- The cross-project example granted only source access and used an unclear placeholder, `project-B_NUMBER`. Added destination bucket IAM bindings and changed the placeholder to `project-PROJECT_B_NUMBER`.
- The Python snippet imported `Duration` but did not use it. Removed the unused import.

## Review Notes
The local environment does not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK and Storage Transfer Service documentation instead of local `--help` output.
