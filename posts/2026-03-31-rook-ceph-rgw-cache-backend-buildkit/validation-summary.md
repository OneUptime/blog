# Validation Summary: How to Use Ceph RGW as Cache Backend for Buildkit

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph (RGW / RADOS Gateway)
- BuildKit (Docker build engine)
- Docker Buildx
- `radosgw-admin` CLI
- AWS CLI (S3-compatible usage)
- GitHub Actions (docker/setup-buildx-action, docker/build-push-action)
- S3 lifecycle policies

## Sources Consulted
- BuildKit GitHub repository (moby/buildkit) - S3 cache source code (`cache/remotecache/s3/s3.go`) for parameter names
- BuildKit official documentation (`docs/buildkitd.toml.md`) for daemon configuration format
- BuildKit README for cache export/import documentation
- Docker Engine documentation for BuildKit enablement (default since Docker Engine 23.0)
- docker/build-push-action GitHub releases for current version
- `radosgw-admin` CLI documentation for user creation flags
- AWS CLI S3 documentation for `mb` and `ls` commands

## Issues Found

1. **Incorrect `--buildkit` flag reference (line 13)**: The post described BuildKit as "the build engine behind `docker build --buildkit`". There is no `--buildkit` flag on `docker build`. BuildKit is the default build engine since Docker Engine 23.0, or can be enabled via the `DOCKER_BUILDKIT=1` environment variable on older versions. Fixed to: "the default build engine behind `docker build` since Docker Engine 23.0".

2. **Fabricated `buildkitd.toml` configuration section (lines 52-67)**: The post contained a `[worker.oci.cache]` TOML configuration block claiming BuildKit supports daemon-level S3 cache configuration with fields like `cacheType`, `region`, `bucket`, `endpointUrl`, `accessKeyID`, `secretAccessKey`, `usePathStyle`. This section does not exist in BuildKit's configuration format. The official `buildkitd.toml` documentation shows no cache backend configuration - only `[worker.oci]`, `[worker.oci.labels]`, `[[worker.oci.gcpolicy]]`, and registry sections. S3 cache is configured per-build only. Replaced the entire section with the correct `buildctl` approach using `--export-cache` and `--import-cache` flags.

3. **Outdated GitHub Action version (line 76)**: `docker/build-push-action@v5` is outdated. Updated to `@v6` which is the current stable major version.

## Review Notes
- The `docker buildx build` command with S3 cache parameters (`--cache-to` and `--cache-from`) is fully correct - all parameter names (`region`, `bucket`, `name`, `endpoint_url`, `access_key_id`, `secret_access_key`, `use_path_style`, `mode`) match the BuildKit source code.
- The `radosgw-admin user create` command syntax is correct.
- The S3 lifecycle policy JSON structure is valid.
- The AWS CLI commands for bucket creation and listing are correct.
- The GitHub Actions workflow structure is correct and the `cache-from`/`cache-to` inputs are properly passed through to BuildKit.
