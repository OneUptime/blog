# Validation Summary: How to Deploy Minio (S3-Compatible Storage) via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose / Docker
- MinIO
- MinIO Client (`mc`)
- S3-compatible object storage
- PostgreSQL backups
- Python / Boto3

## Sources Consulted
- MinIO official repository README: https://github.com/minio/minio/blob/master/README.md
- MinIO official Docker Compose example: https://github.com/minio/minio/blob/master/docs/orchestration/docker-compose/docker-compose.yaml
- MinIO Console documentation: https://docs.min.io/community/minio-object-store/administration/minio-console.html
- MinIO healthcheck probes: https://docs.min.io/community/minio-object-store/operations/monitoring/healthcheck-probe.html
- MinIO `mc mb` reference: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-mb.html
- MinIO `mc anonymous set` reference: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-anonymous-set.html
- MinIO `mc ready` reference: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-ready.html
- MinIO `mc version enable` reference: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-version-enable.html
- MinIO server reference for distributed hostname and directory expansion: https://docs.min.io/enterprise/aistor-object-store/reference/release-notes/aistor-server/
- Boto3 configuration guide: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/configuration.html

## Issues Found
- The Compose healthcheck used `curl`, but the current official MinIO Compose example uses `mc ready local`. I updated the healthcheck to match MinIO's current documented container guidance.
- The access section told readers to log in with `minioadmin`, which becomes incorrect if `MINIO_ROOT_USER` is changed. I updated it to reference the configured `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`.
- The `mc` examples were written as `docker exec minio mc ...` even though the section says to install `mc`. I changed them to host-side `mc` commands to match MinIO's documented quickstart flow.
- The PostgreSQL backup example tried to upload a host file from inside the MinIO container with `docker exec minio mc cp $DB_BACKUP ...`, which would not work because the file exists on the host, not in the container. I changed it to `mc cp "$DB_BACKUP" ...` and quoted the shell variables.
- The application config comment said MinIO accepts any region string. I corrected this to say the application should use the region configured on the MinIO server.
- The boto3 example used `boto3.session.Config(...)` and did not explicitly set path-style addressing. I updated it to use `Config` from `botocore.config` with `signature_version='s3v4'` and `s3={'addressing_style': 'path'}`.
- The distributed-mode example used an incomplete and misleading command template. I updated it to reflect MinIO's documented requirements for sequential hostnames, shared command values across nodes, and per-node storage volumes.

## Review Notes
- Docker Hub still publishes `minio/minio:latest` as of 2026-04-24, so the image reference is currently valid. Pinning a release tag would still improve reproducibility.
- `MINIO_VOLUMES` is functionally equivalent to the `minio server DIRECTORIES` argument in this stack. It is redundant here, but not technically incorrect, so it was left unchanged.
