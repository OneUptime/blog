# Validation Summary: How to Run Minio in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- MinIO Server
- MinIO Client (`mc`)
- S3-compatible object storage
- AWS Signature Version 4
- Prometheus metrics
- Container volumes

## Sources Consulted
- MinIO Object Storage for Container documentation: https://min.io/docs/minio/container/index.html
- MinIO Server command reference: https://min.io/docs/minio/linux/reference/minio-server/minio-server.html
- MinIO Client command reference: https://min.io/docs/minio/linux/reference/minio-mc.html
- MinIO `mc anonymous set` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-anonymous-set.html
- MinIO healthcheck API documentation: https://min.io/docs/minio/linux/operations/monitoring/healthcheck-probe.html
- MinIO metrics and logging settings: https://min.io/docs/minio/linux/reference/minio-server/settings/metrics-and-logging.html
- MinIO console settings: https://min.io/docs/minio/linux/reference/minio-server/settings/console.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- AWS S3 Signature Version 4 authentication documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html
- curl `--aws-sigv4` documentation: https://curl.se/docs/manpage.html

## Issues Found
- The post used `docker.io/minio/minio` and unqualified `minio/minio` / `minio/mc` image names. Updated commands to use the fully qualified `quay.io/minio/minio:latest` and `quay.io/minio/mc:latest` images shown in current MinIO container documentation and to avoid Podman short-name resolution prompts.
- The `mc` container examples passed `mc` as the first command argument even though the MinIO Client image starts the `mc` binary as its entrypoint. Removed the extra `mc` prefix from the `alias set`, `mb`, `ls`, and `anonymous set-json` commands.
- The `mc-config` named volume was used without being created. Added `podman volume create mc-config` before using it.
- The raw S3 API `curl` examples used HTTP Basic auth with `-u`, which does not authenticate S3 REST operations. Updated those examples to use curl's `--aws-sigv4` option with the MinIO credentials.
- The custom MinIO example reused `minio-data`, which could already be mounted by the persistent container if the commands are run sequentially. Changed it to a separate `minio-custom-data` volume and added that volume to cleanup.
- The bucket policy example applied a policy to `public-bucket` without creating that bucket first. Added an `mc mb local/public-bucket` command before applying the anonymous policy.
- The monitoring metrics example used Basic auth against MinIO's Prometheus endpoint. MinIO metrics default to JWT authentication unless configured as public, so the custom container now sets `MINIO_PROMETHEUS_AUTH_TYPE=public`, and the metrics curl command targets that instance.
- The monitoring section used `/minio/health/ready`, which is not the documented MinIO healthcheck endpoint in the consulted MinIO healthcheck API reference. Replaced it with documented cluster health endpoints.

## Review Notes
- The examples are suitable for local development and evaluation, not production hardening. Future improvements could include pinning MinIO release tags instead of `latest`, using stronger credentials, and avoiding public Prometheus metrics outside a local test environment.
