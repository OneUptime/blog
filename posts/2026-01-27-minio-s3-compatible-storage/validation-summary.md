# Validation Summary: How to Set Up MinIO for S3-Compatible Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MinIO object storage
- S3-compatible APIs
- Docker and Docker Compose
- systemd
- MinIO Client (`mc`)
- IAM-style access policies
- AWS SDK for Python (`boto3`)
- AWS SDK for JavaScript v3
- MinIO Go SDK
- TLS certificates
- Prometheus metrics
- Health checks
- Backup, mirroring, replication, and versioning

## Sources Consulted
- MinIO community quickstart and source-only distribution notes: https://charts.min.io/
- MinIO distributed deployment documentation: https://github.com/minio/minio/blob/master/docs/distributed/README.md
- MinIO `mc` client documentation: https://github.com/minio/mc
- MinIO `mc admin user add` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-user/mc-admin-user-add/
- MinIO `mc admin policy attach` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-policy/mc-admin-policy-attach/
- MinIO `mc admin policy create` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-policy/mc-admin-policy-create/
- MinIO Prometheus metrics v2 documentation: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v2/
- MinIO Prometheus setup documentation: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/collect-minio-metrics-using-prometheus/
- MinIO Prometheus metrics list: https://github.com/minio/minio/blob/master/docs/metrics/prometheus/list.md
- MinIO health check documentation: https://github.com/minio/minio/blob/master/docs/metrics/healthcheck/README.md
- MinIO TLS documentation: https://github.com/minio/minio/blob/master/docs/tls/README.md
- MinIO site replication documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-replicate/
- MinIO versioning and `mc cp --version-id` documentation: https://docs.min.io/aistor/administration/objects-and-versioning/versioning/
- Boto3 configuration documentation: https://docs.aws.amazon.com/boto3/latest/guide/configuration.html
- AWS SDK for JavaScript v3 client documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-client-constructors.html
- MinIO Go SDK documentation: https://github.com/minio/minio-go

## Issues Found
- The post overstated S3 compatibility as requiring no code changes. Updated the wording to "minimal configuration changes" to match MinIO's documented endpoint and credential configuration requirements.
- The host binary installation recommended downloading a prebuilt community binary from `dl.min.io`. Current community MinIO documentation says community builds are source-only and prebuilt binaries are legacy/unmaintained, so the section now installs from source with `go install`.
- The distributed-mode minimum requirement claimed at least 4 drives. Current MinIO distributed documentation states the minimum is 2 drives, while 4 or more remains a practical fault-tolerance recommendation. Updated the requirement and best-practice wording.
- The Docker Compose example exposed ports `9000` and `9001` on both `minio4` and `nginx`, which would fail with duplicate host port bindings. Removed the incomplete `nginx` service from the runnable Compose snippet.
- The web console and access-control sections used "service account" for commands and UI steps that create MinIO users. Updated those references to "users".
- The Docker TLS example mounted `~/minio/certs`, while the preceding TLS instructions created certificates in `~/.minio/certs`. Updated the mount path to match the documented certificate location.
- The metrics section omitted `/minio/v2/metrics/bucket` and `/minio/v2/metrics/resource`. Added those endpoints.
- Several Prometheus metric names were outdated or incorrect. Updated object count, TTFB, drive usage, and cluster node metrics to current documented names.

## Review Notes
The remaining Docker examples use the common MinIO container image pattern. Current official community documentation emphasizes source builds for the community edition and AIStor images for licensed deployments, so future revisions could split the tutorial into "community source build" and "AIStor/free license container" paths for clearer version alignment.
