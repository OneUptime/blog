# Validation Summary: How to Configure Docker Registry with Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- CNCF Distribution / Docker Registry
- Google Cloud Storage
- Google Cloud CLI and gsutil
- Google Cloud IAM service accounts
- GKE Workload Identity Federation
- Redis cache configuration
- Nginx reverse proxy

## Sources Consulted
- CNCF Distribution registry configuration: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution Google Cloud Storage driver: https://distribution.github.io/distribution/storage-drivers/gcs/
- CNCF Distribution garbage collection: https://distribution.github.io/distribution/about/garbage-collection/
- Google Cloud Storage classes: https://docs.cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage gsutil tool guidance: https://docs.cloud.google.com/storage/docs/gsutil
- Google Cloud Storage IAM roles: https://docs.cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud gcloud storage folders create reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/folders/create
- Google Cloud Workload Identity Federation for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud service account key creation: https://docs.cloud.google.com/iam/docs/keys-create-delete

## Issues Found
- The GCS `rootdirectory` prefix was configured but not created. CNCF Distribution documents that a configured GCS prefix must exist before registry startup. Added a `gcloud storage folders create` command for `gs://my-docker-registry-storage/docker/registry/v2/`.
- The `chunksize` explanation described multipart uploads and implied a 5MB minimum. The Distribution GCS driver documents this as the chunk size for large/resumable uploads and requires it to be a multiple of 256KiB, with 5MB as the default. Updated the comments and explanation.
- The garbage collection dry-run command placed `--dry-run` after the config path. The official syntax places options before the config path. Updated the command to `bin/registry garbage-collect --dry-run /etc/docker/registry/config.yml`.
- The garbage collection section did not mention the official safety requirement to stop the registry or run it in read-only mode during garbage collection. Added that caveat.
- The Cloud Storage class examples used lowercase `standard` and `nearline`. Updated them to the documented API/CLI names `STANDARD` and `NEARLINE`.

## Review Notes
- Google now recommends `gcloud storage` over `gsutil`; `gsutil` is legacy and minimally maintained. The post still uses `gsutil` for most examples because the commands remain supported and rewriting the whole guide would be a broader modernization rather than a correctness fix.
- The GKE section is accurate for Workload Identity Federation when Application Default Credentials are available to the registry pod through the GKE metadata server and the workload has the required bucket permissions.
