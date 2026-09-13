# Validation Summary: Why Uploaded Files Disappear on Cloud Run

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Run services
- Cloud Run container filesystems, in-memory volumes, and ephemeral disk volumes
- Cloud Logging instance metadata
- Google Cloud CLI (`gcloud`)
- Google Cloud Storage
- Google Cloud Storage Python client library
- Python temporary-file handling

## Sources Consulted
- [Cloud Run container runtime contract](https://docs.cloud.google.com/run/docs/container-contract#filesystem)
- [Configure an ephemeral disk for Cloud Run services](https://docs.cloud.google.com/run/docs/configuring/services/ephemeral-disk)
- [Configure in-memory volume mounts for Cloud Run services](https://docs.cloud.google.com/run/docs/configuring/services/in-memory-volume-mounts)
- [Logging and viewing logs in Cloud Run](https://docs.cloud.google.com/run/docs/logging)
- [`gcloud run services describe` reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/describe)
- [Upload objects from memory](https://docs.cloud.google.com/storage/docs/uploading-objects-from-memory)
- [Cloud Storage request preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions)
- [Cloud Storage Python `Blob.upload_from_string` reference](https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob#google_cloud_storage_blob_Blob_upload_from_string)
- [Cloud Storage Python timeout and retry configuration](https://docs.cloud.google.com/python/docs/reference/storage/latest/retry_timeout)

## Issues Found
No technical issues found.

## Review Notes
- Cloud Run ephemeral disk is correctly identified as a Preview feature as of the validation date. Its contents are instance-local and are deleted when the instance shuts down.
- The default writable container filesystem and dedicated in-memory volumes are correctly distinguished. Both consume configured container memory, while a dedicated in-memory volume can impose a size limit.
- The `gcloud run services describe` command and `--format=export` output format are valid.
- `LogEntry.labels.instanceId` is the documented Cloud Logging field for correlating logs with a Cloud Run instance.
- The Python upload sample uses the current `google-cloud-storage` API correctly. `if_generation_match=0` makes creation conditional on there being no live object with the same name and enables safe conditional retries under the client's default retry policy.
- The examples are illustrative and explicitly disclose that they were not deployed to a Cloud Run project.
