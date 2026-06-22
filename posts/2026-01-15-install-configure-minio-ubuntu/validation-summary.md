# Validation Summary: How to Install and Configure MinIO on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- MinIO (server and `mc` client)
- Ubuntu (systemd service management)
- S3-compatible object storage API
- TLS/HTTPS (OpenSSL self-signed certs, Let's Encrypt/certbot)
- Distributed mode and erasure coding
- Lifecycle management, event notifications (webhook, Kafka)
- Prometheus metrics
- Python boto3 and AWS CLI integration

## Sources Consulted
- MinIO `mc admin scanner` reference — https://docs.min.io/community/minio-object-store/reference/minio-mc-admin/mc-admin-scanner.html
- MinIO `mc admin scanner status` reference — https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-scanner-status.html
- MinIO `mc admin replicate` reference — https://docs.min.io/community/minio-object-store/reference/minio-mc-admin/mc-admin-replicate.html
- MinIO `mc replicate resync` reference — https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-replicate-resync.html
- MinIO admin command reference — https://min.io/docs/minio/linux/reference/minio-mc-admin.html

## Issues Found
1. **`mc admin scanner myminio` is not a valid invocation (two occurrences).** `mc admin scanner` is a parent command that requires a subcommand. The correct usage to view disk/scanner health is `mc admin scanner status myminio` (alias `mc admin scanner info`). Fixed both occurrences (Health Check section and Common Issues section) to `mc admin scanner status myminio`.

2. **`mc admin replicate resync start myminio mybucket` was incorrect for resyncing a bucket.** `mc admin replicate resync` operates on *site replication* and takes two deployment aliases (`ALIAS1 ALIAS2`), not an alias plus a bucket name. The section header and comment indicate the intent was to resync a single bucket's replication, which is handled by the bucket-level command `mc replicate resync start ALIAS/BUCKET --remote-bucket "<ARN>"`. Replaced the line with `mc replicate resync start myminio/mybucket --remote-bucket "arn:minio:replication::<replication-id>:mybucket"`.

## Review Notes
- The binary/.deb download URLs, quick-start commands, default `minioadmin/minioadmin` credentials, and `--console-address` flag are all correct and current.
- The systemd unit matches MinIO's officially documented service template (`User`/`Group=minio-user`, `EnvironmentFile`, `MINIO_VOLUMES`/`MINIO_OPTS`, `LimitNOFILE`, `TasksMax=infinity`, etc.).
- Modern `mc` syntax is used correctly: `mc anonymous set ...` (replaces the deprecated `mc policy set`), `mc admin policy create`/`attach` (replaces the older `add`/`set`), `mc version enable`, `mc mb --with-lock`, and `mc ilm import`.
- `mc admin heal` and `mc admin heal -r` remain valid commands. Note: in recent MinIO releases healing is largely automatic and these commands may emit a notice; left unchanged as they are still functional and correct.
- Prometheus metrics path `/minio/v2/metrics/cluster`, the boto3 client setup, and AWS CLI `--endpoint-url` usage are all accurate.
- Distributed-mode and erasure-coding volume expansion syntax (`{1...4}`, `http://node{1...4}...`) is correct.
