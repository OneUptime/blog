# Validation Summary: How to Build MinIO Erasure Coding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MinIO object storage
- MinIO erasure coding
- Reed-Solomon erasure coding
- MinIO Client (`mc`)
- Docker Compose
- systemd
- Prometheus metrics
- Nginx reverse proxying

## Sources Consulted
- MinIO AIStor erasure coding documentation: https://docs.min.io/aistor/operations/core-concepts/erasure-coding/
- MinIO erasure code settings documentation: https://docs.min.io/aistor/reference/aistor-server/settings/storage-class/
- MinIO Docker Compose deployment documentation: https://docs.min.io/aistor/installation/container/distributed/
- Official MinIO community Docker Compose example: https://github.com/minio/minio/blob/master/docs/orchestration/docker-compose/docker-compose.yaml
- MinIO `mc admin heal` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-heal/
- MinIO `mc admin info` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-info/
- MinIO Prometheus metrics v2 documentation: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v2/
- Current `mc` CLI help output from `quay.io/minio/mc:latest` for `mc admin heal`, `mc admin trace`, `mc admin info`, and `mc ready`.

## Issues Found
- The erasure coding modes table claimed MinIO defaults to half data and half parity for 12- and 16-drive erasure sets. Current MinIO defaults are `EC:4` for 8-16 drive erasure sets, so the table and explanatory text were corrected.
- The table's "Drives Tolerable" wording did not distinguish read tolerance from write quorum behavior. The column now says "Read Failures Tolerable".
- The systemd service defined `MINIO_OPTS` in `/etc/default/minio` but did not use it in `ExecStart`, so the console address would not apply. `ExecStart` now includes `$MINIO_OPTS`.
- The Docker Compose healthcheck used `curl`, which does not match the official MinIO Compose example. It now uses `mc ready local`, and the server command order was aligned with the official example.
- The Docker Compose snippet referenced `./nginx.conf` without stating that the file must be provided. A short note was added.
- The storage class description said parity could be chosen per bucket or object. MinIO storage class selection is object-based through request metadata, so the wording now says objects.
- The `mc admin heal` examples used removed/unsupported flags (`--recursive` and `--background`) with the current `mc` client. They were replaced with current supported commands.
- The Prometheus metric names and descriptions included outdated or incorrect entries. `minio_cluster_drive_offline_total` was changed to `minio_cluster_disk_offline_total`, `minio_cluster_health` to `minio_cluster_health_status`, and healing metrics were clarified.

## Review Notes
The Docker Compose example remains a development/testing topology because all services run on one host. For production, MinIO recommends distributed deployments across separate hosts and careful capacity planning with server pools.
