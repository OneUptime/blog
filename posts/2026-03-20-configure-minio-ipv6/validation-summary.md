# Validation Summary: How to Configure MinIO with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MinIO (object storage server)
- IPv6 networking
- systemd
- mc (MinIO Client)
- AWS CLI (S3-compatible usage)
- Python boto3 (S3 client)
- TLS (via `--certs-dir`)

## Sources Consulted
- MinIO community documentation: https://docs.min.io/community/minio-object-store/operations/install-deploy-manage/deploy-minio-multi-node-multi-drive.html
- MinIO distributed design doc: https://github.com/minio/minio/blob/master/docs/distributed/DESIGN.md
- MinIO server reference (`minio server` flags including `--address`, `--console-address`, `--certs-dir`)
- MinIO official systemd service template (`MINIO_OPTS`, `MINIO_VOLUMES`, `minio-user`)
- RFC 3986 for IPv6 URI bracket notation (`http://[2001:db8::10]:9000/`)
- MinIO health probe reference (`/minio/health/live`)
- AWS CLI v2 reference for `--endpoint-url` and `aws configure set default.s3.endpoint_url`
- boto3 documentation for `endpoint_url`, `signature_version='s3v4'` with MinIO

## Issues Found
No technical issues found.

- The `--address`, `--console-address`, and `--certs-dir` flags are valid `minio server` flags.
- IPv6 literals are correctly bracketed (`[2001:db8::10]:9000`) in CLI args, env vars, URLs, and Python.
- `[::]:9000` correctly binds to all IPv6 interfaces (and on dual-stack Linux systems also accepts IPv4-mapped connections).
- The distributed-mode example omits explicit ports in the endpoint URLs (e.g., `http://[2001:db8::10]/data`), which is consistent with the canonical MinIO documentation example (`minio server http://host{1...16}/export{1...64}`) — MinIO uses port 9000 as the default endpoint port.
- The systemd unit, `MINIO_OPTS`, `MINIO_VOLUMES`, `minio-user`/`minio-user`, and `ExecStart` line all match the official MinIO systemd template.
- Health endpoint `/minio/health/live` is correct.
- mc commands (`mc alias set`, `mc ls`, `mc mb`, `mc cp`) use current syntax.
- AWS CLI `--endpoint-url` flag and `aws configure set default.s3.endpoint_url` are both valid.
- boto3 example uses correct `endpoint_url`, SigV4, and standard S3 methods (`create_bucket`, `upload_file`, `list_objects_v2`, `download_file`).

## Review Notes
- For production deployments, the example credentials (`minioadmin`/`minioadmin`) should obviously be replaced; the post uses them only for illustration, which is fine.
- The distributed example uses 4 nodes with a single drive each. MinIO recommends erasure-coded deployments and typically expands per-node drives via the `{1...n}` ellipsis pattern; the simpler 4-node/1-drive form shown is still valid for an IPv6-focused tutorial.
- For dual-stack systems, binding to `[::]:9000` will, by default on Linux, also accept IPv4 connections via IPv4-mapped IPv6 addresses unless `net.ipv6.bindv6only` is set. This is not a correctness issue with the post, just a deployment consideration worth being aware of.
- AWS CLI service-specific endpoint configuration is moving toward the `services` section / `AWS_ENDPOINT_URL_S3` env var in newer AWS CLI v2 releases, but the `default.s3.endpoint_url` form shown remains supported.
