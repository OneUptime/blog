# Validation Summary: How to Run MinIO in Docker (S3-Compatible Object Storage)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- MinIO
- MinIO Client (`mc`)
- Amazon S3-compatible APIs
- Python `boto3`
- AWS SDK for JavaScript v3
- Prometheus metrics
- MinIO bucket lifecycle rules
- MinIO bucket event notifications

## Sources Consulted
- MinIO Object Storage for Container documentation: https://min.io/docs/minio/container/index.html
- MinIO single-node container deployment documentation: https://min.io/docs/minio/container/operations/install-deploy-manage/deploy-minio-single-node-single-drive.html
- MinIO Server reference: https://min.io/docs/minio/linux/reference/minio-server/minio-server.html
- MinIO Client (`mc`) reference: https://min.io/docs/minio/linux/reference/minio-mc.html
- MinIO `mc ilm rule add` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-rule-add.html
- MinIO `mc event add` reference: https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-event/mc-event-add/
- MinIO webhook notification documentation: https://min.io/docs/minio/macos/administration/monitoring/publish-events-to-webhook.html
- MinIO Prometheus generation reference: https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-prometheus-generate.html
- MinIO erasure code settings reference: https://min.io/docs/minio/linux/reference/minio-server/settings/storage-class.html
- MinIO erasure coding concepts: https://min.io/docs/minio/linux/operations/concepts/erasure-coding.html
- AWS SDK for JavaScript v3 S3 documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/
- Boto3 S3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3.html

## Issues Found
- The introduction and conclusion overstated MinIO compatibility as the full Amazon S3 API with no application changes. Updated the wording to match MinIO's documented support for core S3 APIs and to acknowledge endpoint and credential changes.
- The Docker image references used `minio/minio` and `minio/mc`. Updated them to the currently documented `quay.io/minio/minio` and `quay.io/minio/mc` images.
- The one-line Docker `mc` bucket creation example chained `mc mb` on the host after `docker run`. Changed it to run both `mc` commands inside the `quay.io/minio/mc` container through `/bin/sh -c`.
- The Node.js example imported `GetObjectCommand` but did not use it. Removed the unused import.
- The distributed-mode description said the example used 4 nodes with 4 drives each, but the Compose file mounted 2 drives per node. Corrected the description to 4 nodes with 2 drives each.
- The lifecycle-rule example passed `sh -c` to the `mc` entrypoint instead of to a shell. Updated it to override the entrypoint and chain the alias and lifecycle commands correctly.
- The Prometheus example assumed an `mc` alias existed inside the MinIO server container and used the older v2 path. Updated it to configure an alias in a temporary `mc` container and scrape the documented v3 cluster metrics endpoint.
- The webhook notification example added a bucket event rule without first configuring a webhook notification target. Added the required `mc admin config set notify_webhook:primary` step, service restart, and matching `arn:minio:sqs::primary:webhook` event rule.

## Review Notes
The Docker examples use `--network host`, which is most straightforward on Linux. Docker Desktop support varies by version and settings, so future revisions could include a bridge-network alternative for macOS and Windows users.
