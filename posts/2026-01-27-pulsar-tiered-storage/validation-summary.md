# Validation Summary: How to Configure Pulsar Tiered Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Pulsar tiered storage
- Apache BookKeeper managed ledgers
- Pulsar broker configuration
- Pulsar Admin CLI
- Amazon S3 and AWS IAM
- Google Cloud Storage and GCP IAM
- Azure Blob Storage and Azure CLI
- Kubernetes
- Prometheus and Grafana
- Python cost estimation

## Sources Consulted
- Apache Pulsar Tiered Storage overview: https://pulsar.apache.org/docs/next/cookbooks-tiered-storage/
- Apache Pulsar AWS S3 offloader documentation: https://pulsar.apache.org/docs/next/tiered-storage-aws/
- Apache Pulsar GCS offloader documentation: https://pulsar.apache.org/docs/next/tiered-storage-gcs/
- Apache Pulsar Azure BlobStore offloader documentation: https://pulsar.apache.org/docs/next/tiered-storage-azure/
- Apache Pulsar S3-compatible offloader documentation: https://pulsar.apache.org/docs/next/tiered-storage-s3/
- Apache Pulsar broker configuration source: https://raw.githubusercontent.com/apache/pulsar/master/conf/broker.conf
- Apache Pulsar Admin CLI source for topics and namespaces: https://github.com/apache/pulsar/tree/master/pulsar-client-tools/src/main/java/org/apache/pulsar/admin/cli
- Apache Pulsar metrics reference: https://pulsar.apache.org/docs/next/reference-metrics/
- AWS CLI `s3api put-bucket-lifecycle-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Google Cloud SDK `gcloud storage buckets add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- Azure CLI blob delete-policy command reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob/service-properties/delete-policy

## Issues Found
- Added `offloadersDirectory=./offloaders` to Pulsar offloader configuration examples because Pulsar documents it as a required offloader setting.
- Replaced unsupported S3 static credential properties in `broker.conf` with the documented AWS default credential-chain options and S3 role properties.
- Added missing S3 multipart and KMS permissions to the IAM example so it matches the documented multipart upload behavior and the post's SSE-KMS bucket configuration.
- Updated the GCS IAM command from the older `gsutil iam ch` style to the current `gcloud storage buckets add-iam-policy-binding` form.
- Rewrote the Azure Blob offloader configuration to use Pulsar's documented `managedLedgerOffloadBucket`, generic offload block/read-buffer settings, and Azure storage account environment variables. Removed unsupported `azureBlobStorage*` broker properties and the deprecated AAD Pod Identity example.
- Fixed time-based namespace offload examples by adding `--size -1`, since the current `pulsar-admin namespaces set-offload-threshold` command requires `--size`.
- Fixed manual topic offload examples to use `--size-threshold`; the current CLI does not offload by `--message-id`, and it requires a size threshold.
- Changed the topic offload deletion lag example to use `4h` instead of a bare millisecond number for clarity with the CLI duration converter.
- Removed lifecycle transitions to S3 Glacier Flexible Retrieval and Deep Archive from the live tiered-storage lifecycle policy because those classes require restore before normal object reads. Kept Glacier Instant Retrieval for active tiered-storage reads and described deeper archive as a separate backup copy.
- Replaced the invalid offloaded-data compression configuration with valid managed-ledger metadata compression settings.
- Replaced non-existent Pulsar Prometheus metrics such as `pulsar_offload_error_total`, `pulsar_offload_rate`, and `pulsar_read_from_offloaded_total` with documented storage/offload metrics.
- Converted the production `broker.conf` checklist from YAML-style syntax to real Java properties syntax and replaced unsupported tuning keys with documented offload thread and prefetch settings.
- Updated troubleshooting metric commands to grep documented Pulsar metrics and replaced the S3 Transfer Acceleration suggestion with a same-region placement recommendation.

## Review Notes
- The post remains a practical guide, but many examples still use placeholder bucket names, account IDs, project IDs, regions, credentials, and topic names that must be replaced before use.
- The cost-estimation script is syntactically valid and intentionally illustrative; actual prices vary by region, request mix, storage class minimum-duration charges, retrieval charges, and cloud-provider pricing changes.
