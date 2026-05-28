# Validation Summary: How to Migrate Azure Blob Storage to Google Cloud Storage Using gsutil

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Storage
- gsutil
- gcloud CLI
- Storage Transfer Service
- Azure Blob Storage
- Azure CLI
- AzCopy
- Python Azure Storage Blob SDK
- Python Google Cloud Storage client library

## Sources Consulted
- Google Cloud Storage gsutil overview and built-in help guidance: https://docs.cloud.google.com/storage/docs/gsutil
- GoogleCloudPlatform gsutil cp command source/help text: https://raw.githubusercontent.com/GoogleCloudPlatform/gsutil/master/gslib/commands/cp.py
- GoogleCloudPlatform gsutil rsync command source/help text: https://raw.githubusercontent.com/GoogleCloudPlatform/gsutil/master/gslib/commands/rsync.py
- Google Cloud Storage parallel composite uploads documentation: https://cloud.google.com/storage/docs/parallel-composite-uploads
- Google Cloud Storage storage classes documentation: https://docs.cloud.google.com/storage/docs/storage-classes
- gcloud transfer jobs create reference: https://docs.cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- Storage Transfer Service create transfers documentation: https://cloud.google.com/storage-transfer/docs/create-transfers
- Storage Transfer Service TransferSpec / AzureCredentials reference: https://cloud.google.com/storage-transfer/docs/reference/rest/v1/TransferSpec#AzureCredentials
- Azure CLI az storage container generate-sas reference: https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest#az-storage-container-generate-sas
- Microsoft AzCopy download blobs documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-download

## Issues Found
- The post said gsutil needed Azure credentials and suggested configuring Azure credentials in `.boto`. Updated this to clarify that gsutil needs Google Cloud Storage access, while AzCopy, Azure CLI, or Storage Transfer Service needs Azure access.
- The SAS token example used a hard-coded expiry date that was already expired on the validation date. Replaced it with a generated expiry value based on the current date.
- The AzCopy sample URL used a hard-coded SAS query string that did not match the shown container SAS generation flow. Updated it to use the generated `SAS_TOKEN` variable.
- The Storage Transfer Service `azure-creds.json` example used an invalid wrapper shape and included `storageAccount` in the credentials file. Updated it to the AzureCredentials shape expected by `--source-creds-file`.
- The `gsutil mb` and `gsutil cp -s` examples used lowercase storage class names. Updated them to the documented CLI/API storage class names.
- The metadata section implied Azure metadata would be preserved automatically in the two-step local workflow. Updated the wording to state that custom Azure metadata needs explicit handling.
- The Python metadata script referenced `azure_conn_str` without defining it. Added a placeholder connection string assignment.

## Review Notes
The gsutil commands remain valid, but Google now describes gsutil as a legacy, minimally maintained Cloud Storage CLI and generally recommends `gcloud storage` for new workflows. The article already mentions `gcloud storage` as the newer option.
