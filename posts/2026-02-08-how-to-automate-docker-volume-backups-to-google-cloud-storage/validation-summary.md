# Validation Summary: How to Automate Docker Volume Backups to Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker volumes
- Docker CLI
- Docker Compose
- Bash scripting
- Cron
- Google Cloud CLI
- Google Cloud Storage
- Cloud Storage Object Lifecycle Management
- Slack incoming webhooks

## Sources Consulted
- Docker Docs: Storage and volume persistence, https://docs.docker.com/engine/storage/
- Docker Docs: Volumes and backup/restore patterns, https://docs.docker.com/engine/storage/volumes/
- Docker Docs: docker container run reference, https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose services reference, https://docs.docker.com/reference/compose-file/services/
- Google Cloud SDK: gcloud storage buckets create, https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud SDK: gcloud storage buckets add-iam-policy-binding, https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- Google Cloud SDK: gcloud iam service-accounts create, https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK: gcloud iam service-accounts keys create, https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud SDK: gcloud storage cp, https://docs.cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud SDK: gcloud storage ls, https://docs.cloud.google.com/sdk/gcloud/reference/storage/ls
- Google Cloud SDK: gcloud storage buckets update, https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud Storage: Object Lifecycle Management, https://docs.cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage: Lifecycle configuration examples, https://docs.cloud.google.com/storage/docs/lifecycle-configurations
- Google Cloud Storage: Storage classes and minimum storage durations, https://docs.cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage: Parallel composite uploads, https://docs.cloud.google.com/storage/docs/parallel-composite-uploads
- Google Cloud Storage: gsutil tool status and migration guidance, https://docs.cloud.google.com/storage/docs/gsutil/commands/cp

## Issues Found
- The backup script hard-coded `GCS_BUCKET` and `VOLUMES`, while the later Docker Compose example provided `GCS_BUCKET` and `BACKUP_VOLUMES` environment variables. Updated the script to read those environment variables with defaults and to accept comma-separated volume lists.
- The post used `gsutil` for object copy, list, and lifecycle commands even though current Google documentation recommends `gcloud storage` for Cloud Storage operations. Replaced those examples with `gcloud storage cp`, `gcloud storage ls`, and `gcloud storage buckets update --lifecycle-file`.
- The lifecycle policy used `matchesPrefix: ["backups/"]`, but the upload path was `${GCS_BUCKET}/${HOSTNAME}/${VOLUME}/...`, so the lifecycle rules would not match the uploaded backups. Removed the mismatched prefix conditions so the rules apply to the dedicated backup bucket.
- The original bucket and lifecycle settings could trigger early deletion charges by using Nearline storage, moving objects to Coldline after 7 days, and deleting them after 30 days. Updated the bucket default to Standard storage and changed lifecycle timing to move objects to Coldline after 30 days and delete after 120 days.
- The dedicated backup container example used the host Docker socket, but did not mount the temporary backup directory into the backup container. The helper container would create archives on the Docker host while the backup container tried to upload from its own filesystem. Added `/tmp/docker-backups:/tmp/docker-backups`.
- The restore command removed `/target/*`, which leaves hidden files behind. Updated it to remove normal files and dotfiles before extracting the backup archive.
- The performance section described a `gsutil` memory-related option as bandwidth limiting. Replaced it with current `gcloud storage` parallel upload guidance and a resource-concurrency note.

## Review Notes
- The shell snippets were checked with `bash -n`.
- `git diff --check` passed.
- `gcloud` and `gsutil` are not installed in this workspace, so Google Cloud command behavior was verified against official Google Cloud documentation rather than local CLI help.
- Ruby is not installed in this workspace, so JSON/YAML snippet parsing with Ruby was not available.
