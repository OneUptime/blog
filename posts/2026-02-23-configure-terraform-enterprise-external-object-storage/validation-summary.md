# Validation Summary: How to Configure Terraform Enterprise with External Object Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Enterprise
- Terraform Enterprise Flexible Deployment Options
- AWS S3
- AWS KMS
- Azure Blob Storage
- Google Cloud Storage
- Docker Compose
- AWS CLI
- Azure CLI
- Google Cloud CLI and gsutil

## Sources Consulted
- HashiCorp Terraform Enterprise object storage configuration: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/connect-object
- HashiCorp Terraform Enterprise Docker Compose example: https://developer.hashicorp.com/terraform/enterprise/deploy/docker/install
- HashiCorp Terraform Enterprise health checks: https://developer.hashicorp.com/terraform/enterprise/deploy/monitor/health-checks
- AWS CLI `create-bucket` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI `put-bucket-versioning` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- AWS CLI `put-bucket-encryption` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html
- Amazon S3 server-side encryption with KMS keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- Azure CLI `az storage account create` command reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI `az storage container create` command reference: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Google Cloud Storage `gsutil mb` command reference: https://cloud.google.com/storage/docs/gsutil/commands/mb
- Google Cloud Storage object lifecycle management: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage IAM roles: https://cloud.google.com/storage/docs/access-control/iam-roles

## Issues Found
- The introduction implied external object storage is broadly required for all production Terraform Enterprise deployments. Updated it to match HashiCorp guidance: object storage is used for external and active-active operational modes, while disk mode uses a mounted disk.
- The post listed policy sets as data stored in object storage. Updated the examples to state files, plan outputs, run logs, and configuration versions, which matches Terraform Enterprise object storage documentation more closely.
- The GCS example added a lifecycle rule to delete old object versions, and the prose claimed it cleaned up versions after 90 days even though the JSON did not include an age condition. HashiCorp explicitly says lifecycle rules that delete, archive, or transition Terraform Enterprise objects should be disabled, so the lifecycle policy example was removed.
- The GCS credentials example showed raw service account JSON and suggested `GOOGLE_APPLICATION_CREDENTIALS` as a file-path alternative. Updated it to use a base64-encoded service account JSON value for `TFE_OBJECT_STORAGE_GOOGLE_CREDENTIALS` and to mention using the attached service account by leaving credentials blank.
- The Docker Compose example omitted `TFE_OPERATIONAL_MODE: external`, which is required for an external-services deployment using external object storage. Added the variable.
- The verification section used the deprecated `/_health_check` endpoint. Replaced it with `/api/v1/health/readiness`, which is the current readiness endpoint in the HashiCorp documentation.
- The verification section used `docker logs tfe`, but the example is a Docker Compose deployment without an explicit container name. Changed it to `docker compose logs tfe`.

## Review Notes
The AWS, Azure, and GCS CLI commands are plausible examples, but real deployments still need environment-specific values such as globally unique bucket or storage account names, customer-managed key identifiers, network access, and complete Terraform Enterprise external database configuration.
