# Validation Summary: How to Fix 'Error: State Lock' in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu remote state locking
- OpenTofu S3 backend
- AWS DynamoDB
- OpenTofu GCS backend
- Google Cloud Storage CLI

## Sources Consulted
- OpenTofu state locking docs: https://opentofu.org/docs/language/state/locking/
- OpenTofu `force-unlock` docs: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu `plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` docs: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu GCS backend docs: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu GCS backend source showing `.tflock` lock files: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/backend/remote-state/gcs/backend_state.go
- OpenTofu S3 backend source showing DynamoDB `LockID` uses `bucket/key`: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/backend/remote-state/s3/client.go
- AWS CLI `dynamodb get-item` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/get-item.html
- AWS CLI `dynamodb delete-item` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/delete-item.html
- Google Cloud Storage `gsutil` docs noting `gcloud storage` is recommended and `gsutil` is legacy: https://docs.cloud.google.com/storage/docs/gsutil
- Google Cloud CLI `gcloud storage ls` reference: https://cloud.google.com/sdk/gcloud/reference/storage/ls
- Google Cloud CLI `gcloud storage rm` reference: https://cloud.google.com/sdk/gcloud/reference/storage/rm

## Issues Found
- The GCS manual lock removal section used `gsutil`. Google now documents `gsutil` as a legacy, minimally maintained CLI and recommends `gcloud storage` commands instead. I replaced `gsutil ls` and `gsutil rm` with `gcloud storage ls` and `gcloud storage rm`.
- The prevention section incorrectly implied that lock timeout is configured inside the backend block and that OpenTofu otherwise waits indefinitely. In OpenTofu, lock wait behavior is controlled by the `-lock-timeout=DURATION` CLI flag on commands such as `tofu plan` and `tofu apply`. I replaced the invalid backend snippet with working CLI examples.
- The conclusion overgeneralized AWS locking as DynamoDB-based. Current OpenTofu S3 backend docs support both DynamoDB locking and native S3 lockfiles, with native S3 locking preferred. I narrowed the wording to AWS S3 backends that are specifically using DynamoDB locking.
- The `force-unlock` confirmation example was fenced as `hcl` even though it is plain terminal output. I changed the code fence to `text`.

## Review Notes
- The core explanation of state locking, stale locks, and `tofu force-unlock` was accurate.
- The DynamoDB key examples are consistent with the OpenTofu S3 backend implementation, which stores the lock under a `LockID` derived from the backend bucket and state path.
- The GCS `.tflock` filename is consistent with the OpenTofu GCS backend implementation.
- Current OpenTofu S3 backend docs describe native S3 locking with `use_lockfile=true` as the preferred mechanism, while DynamoDB locking remains supported.
